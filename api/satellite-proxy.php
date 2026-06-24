<?php
/**
 * Satellite Imagery Proxy for CAP-MAT
 * Proxies requests to the Python satellite-api service
 * 
 * Place this file at: /api/satellite-proxy.php
 * Requires: satellite-api.py running on localhost:8081
 * 
 * Usage:
 *   /api/satellite-proxy.php?lat=39.9&lon=-105.1&radius=100&channel=C13
 *   /api/satellite-proxy.php?endpoint=health
 *   /api/satellite-proxy.php?endpoint=latest&sat=19&sector=C&channel=C13
 *   /api/satellite-proxy.php?endpoint=conus&sat=19&channel=C13
 * 
 * Satellites: GOES-19 (East), GOES-18 (West)
 * 
 * Updated: 2026-01-26
 */

// Configuration
$SATELLITE_API_HOST = getenv('SATELLITE_API_HOST') ?: 'localhost';
$SATELLITE_API_PORT = getenv('SATELLITE_API_PORT') ?: '8081';
$SATELLITE_API_BASE = "http://{$SATELLITE_API_HOST}:{$SATELLITE_API_PORT}/satellite";

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Cache-Control');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Determine endpoint
$endpoint = isset($_GET['endpoint']) ? strtolower($_GET['endpoint']) : 'image';

// Build URL based on endpoint
switch ($endpoint) {
    case 'health':
        $url = "{$SATELLITE_API_BASE}/health";
        $contentType = 'application/json';
        break;
        
    case 'channels':
        $url = "{$SATELLITE_API_BASE}/channels";
        $contentType = 'application/json';
        break;
        
    case 'latest':
        $url = "{$SATELLITE_API_BASE}/latest";
        $params = [];
        if (isset($_GET['sat'])) $params['sat'] = intval($_GET['sat']);
        if (isset($_GET['sector'])) $params['sector'] = $_GET['sector'];
        if (isset($_GET['channel'])) $params['channel'] = $_GET['channel'];
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        $contentType = 'application/json';
        break;
        
    case 'conus':
        $url = "{$SATELLITE_API_BASE}/conus";
        $params = [];
        if (isset($_GET['sat'])) $params['sat'] = intval($_GET['sat']);
        if (isset($_GET['channel'])) $params['channel'] = $_GET['channel'];
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        $contentType = 'image/png';
        break;
        
    case 'image':
    default:
        // Validate required parameters
        if (!isset($_GET['lat']) || !isset($_GET['lon'])) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode(['error' => 'Missing required parameters: lat, lon']);
            exit;
        }
        
        $lat = floatval($_GET['lat']);
        $lon = floatval($_GET['lon']);
        
        // Validate ranges
        if ($lat < -90 || $lat > 90) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode(['error' => 'Invalid latitude (must be -90 to 90)']);
            exit;
        }
        if ($lon < -180 || $lon > 180) {
            header('Content-Type: application/json');
            http_response_code(400);
            echo json_encode(['error' => 'Invalid longitude (must be -180 to 180)']);
            exit;
        }
        
        // Build params
        $params = [
            'lat' => $lat,
            'lon' => $lon,
        ];
        
        if (isset($_GET['radius'])) {
            $radius = floatval($_GET['radius']);
            if ($radius >= 20 && $radius <= 500) {
                $params['radius'] = $radius;
            }
        }
        
        if (isset($_GET['channel'])) {
            // Validate channel format (C01-C16)
            if (preg_match('/^C\d{2}$/i', $_GET['channel'])) {
                $params['channel'] = strtoupper($_GET['channel']);
            }
        }
        
        if (isset($_GET['sat'])) {
            $sat = intval($_GET['sat']);
            if (in_array($sat, [16, 17, 18, 19])) {
                $params['sat'] = $sat;
            }
        }
        
        if (isset($_GET['sector'])) {
            if (in_array($_GET['sector'], ['C', 'F', 'M'])) {
                $params['sector'] = $_GET['sector'];
            }
        }
        
        if (isset($_GET['resolution'])) {
            $res = floatval($_GET['resolution']);
            if ($res >= 0.5 && $res <= 4.0) {
                $params['resolution'] = $res;
            }
        }
        
        $url = "{$SATELLITE_API_BASE}/image?" . http_build_query($params);
        $contentType = 'image/png';
        break;
}

// Make request to satellite API
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 120,  // Satellite rendering can take time
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_HEADER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: ' . $contentType,
        'User-Agent: CAP-MAT/1.0 (Satellite Proxy)'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$upstreamContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
$errno = curl_errno($ch);

curl_close($ch);

// Handle connection errors
if ($errno) {
    header('Content-Type: application/json');
    
    if ($errno == CURLE_COULDNT_CONNECT || $errno == CURLE_OPERATION_TIMEDOUT) {
        http_response_code(503);
        echo json_encode([
            'error' => 'Satellite API unavailable',
            'detail' => 'The satellite imagery service is not responding. It may be starting up or temporarily unavailable.',
            'viewer' => 'https://www.star.nesdis.noaa.gov/GOES/sector.php'
        ]);
    } else {
        http_response_code(502);
        echo json_encode([
            'error' => 'Proxy error',
            'detail' => $error
        ]);
    }
    exit;
}

// Split headers and body
$headers = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

// Set content type
if ($upstreamContentType) {
    header('Content-Type: ' . $upstreamContentType);
} else {
    header('Content-Type: ' . $contentType);
}

// Forward relevant headers from satellite API
if (preg_match('/X-Satellite:\s*(.+)/i', $headers, $m)) {
    header('X-Satellite: ' . trim($m[1]));
}
if (preg_match('/X-Channel:\s*(.+)/i', $headers, $m)) {
    header('X-Channel: ' . trim($m[1]));
}
if (preg_match('/X-Scan-Time:\s*(.+)/i', $headers, $m)) {
    header('X-Scan-Time: ' . trim($m[1]));
}
if (preg_match('/X-Center:\s*(.+)/i', $headers, $m)) {
    header('X-Center: ' . trim($m[1]));
}
if (preg_match('/X-Radius-NM:\s*(.+)/i', $headers, $m)) {
    header('X-Radius-NM: ' . trim($m[1]));
}

// Cache control for images
if ($contentType === 'image/png' && $httpCode === 200) {
    header('Cache-Control: public, max-age=900');  // 15 minutes
} else {
    header('Cache-Control: no-store');
}

// Return response
http_response_code($httpCode);
echo $body;
?>
