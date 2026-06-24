<?php
/**
 * Aviation Weather API Proxy for CAP-MAT
 * Supports AWC (aviationweather.gov), AVWX (avwx.rest), and BUFKIT (ISU/PSU) APIs
 * Place this file at: /api/weather-proxy.php
 * 
 * AWC Endpoints supported:
 *   WEATHER: metar, taf, pirep, windtemp
 *   HAZARDS: airsigmet, gairmet, cwa, sigmet, airmet, isigmet, tfr
 *   NAVIGATION: stationinfo, airport, navaid, fix, obstacle
 *   FORECASTS: fcstdisc, afd
 * 
 * Usage AWC: /api/weather-proxy.php?api=awc&endpoint=metar&ids=KDEN&format=json
 * Usage AWC: /api/weather-proxy.php?api=awc&endpoint=pirep&bbox=-105,39,-104,40&age=2
 * Usage AWC: /api/weather-proxy.php?api=awc&endpoint=airsigmet&format=json
 * Usage AVWX: /api/weather-proxy.php?api=avwx&endpoint=metar/KBJC
 * Usage BUFKIT: /api/weather-proxy.php?api=bufkit&station=ROA&model=hrrr
 * 
 * Updated: 2026-01-25 - Added BUFKIT/HRRR model data support
 */

// Prevent caching
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Cache-Control, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// AVWX API Token - NEVER hardcoded here. Resolved in priority order:
//   1. Server environment variable AVWX_TOKEN (e.g. Apache: SetEnv AVWX_TOKEN ...)
//   2. A git-ignored local file api/secrets.php that returns
//      ['AVWX_TOKEN' => '...']  (copy api/secrets.example.php to create it).
// secrets.php is a .php (not .txt) so a direct web request executes it and
// reveals nothing, instead of serving the raw token. It is git-ignored so the
// token never lands in source / git history.
$AVWX_TOKEN = getenv('AVWX_TOKEN') ?: ($_ENV['AVWX_TOKEN'] ?? ($_SERVER['AVWX_TOKEN'] ?? ''));
if ($AVWX_TOKEN === '' && is_file(__DIR__ . '/secrets.php')) {
    $secrets = require __DIR__ . '/secrets.php';
    if (is_array($secrets) && !empty($secrets['AVWX_TOKEN'])) {
        $AVWX_TOKEN = $secrets['AVWX_TOKEN'];
    }
}

// Determine which API to use (default: awc for backward compatibility)
$api = isset($_GET['api']) ? strtolower($_GET['api']) : 'awc';
$endpoint = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

// =============================================================================
// BUFKIT API (Iowa State / Penn State) - HRRR/RAP/NAM/GFS Model Data
// =============================================================================
if ($api === 'bufkit') {
    header('Content-Type: text/plain; charset=utf-8');
    
    // Get parameters
    $station = isset($_GET['station']) ? strtolower(preg_replace('/^K/i', '', $_GET['station'])) : '';
    $model = isset($_GET['model']) ? strtolower($_GET['model']) : 'hrrr';
    $source = isset($_GET['source']) ? strtoupper($_GET['source']) : 'ISU';
    
    // Validate station (3-4 alphanumeric characters)
    if (!preg_match('/^[a-z0-9]{3,4}$/i', $station)) {
        http_response_code(400);
        echo "Error: Invalid station identifier";
        exit;
    }
    
    // Validate model
    $allowedModels = ['hrrr', 'rap', 'nam', 'gfs', 'nam4km', 'hiresw'];
    if (!in_array($model, $allowedModels)) {
        http_response_code(400);
        echo "Error: Invalid model. Allowed: " . implode(', ', $allowedModels);
        exit;
    }
    
    // Build BUFKIT URL based on source
    if ($source === 'PSU') {
        $baseUrl = "http://www.meteo.psu.edu/bufkit/data/{$model}/{$model}_{$station}.buf";
    } else {
        // Iowa State (default) - primary source
        $baseUrl = "https://meteor.geol.iastate.edu/~ckarsten/bufkit/data/{$model}/{$model}_{$station}.buf";
    }
    
    // Make request
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $baseUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FRESH_CONNECT => true,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_HTTPHEADER => [
            'Accept: text/plain, */*',
            'User-Agent: CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    // If Iowa State fails, try Penn State as fallback
    if (($httpCode !== 200 || $error) && $source !== 'PSU') {
        $fallbackUrl = "http://www.meteo.psu.edu/bufkit/data/{$model}/{$model}_{$station}.buf";
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $fallbackUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Accept: text/plain, */*',
                'User-Agent: CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)'
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
    }
    
    // Handle errors
    if ($error) {
        http_response_code(502);
        echo "Error: Proxy error - " . $error;
        exit;
    }
    
    if ($httpCode === 404) {
        http_response_code(404);
        echo "Error: Station {$station} not available for {$model} model";
        exit;
    }
    
    // Return the response
    http_response_code($httpCode);
    echo $response;
    exit;
}

// =============================================================================
// NWS IMAGE PROXY - For forecast charts/imagery from NOAA/NWS sources
// =============================================================================
if ($api === 'image') {
    // Get the image URL from the 'url' parameter
    $imageUrl = isset($_GET['url']) ? $_GET['url'] : '';
    
    if (empty($imageUrl)) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Missing url parameter']);
        exit;
    }
    
    // Decode the URL (it should be URL-encoded)
    $imageUrl = urldecode($imageUrl);
    
    // Whitelist of allowed domains for security
    $allowedDomains = [
        'www.wpc.ncep.noaa.gov',
        'wpc.ncep.noaa.gov',
        'www.spc.noaa.gov',
        'spc.noaa.gov',
        'www.aviationweather.gov',
        'aviationweather.gov',
        'cdn.star.nesdis.noaa.gov',
        'radar.weather.gov',
        'www.weather.gov',
        'weather.gov',
        'graphical.weather.gov',
        'forecast.weather.gov',
        'airquality.weather.gov',
        'www.nhc.noaa.gov',
        'nhc.noaa.gov',
        'ocean.weather.gov',
        'tgftp.nws.noaa.gov'
    ];
    
    // Parse the URL and validate domain
    $parsedUrl = parse_url($imageUrl);
    if (!$parsedUrl || !isset($parsedUrl['host'])) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Invalid URL format']);
        exit;
    }
    
    $host = strtolower($parsedUrl['host']);
    $domainAllowed = false;
    foreach ($allowedDomains as $domain) {
        if ($host === $domain || str_ends_with($host, '.' . $domain)) {
            $domainAllowed = true;
            break;
        }
    }
    
    if (!$domainAllowed) {
        header('Content-Type: application/json');
        http_response_code(403);
        echo json_encode(['error' => 'Domain not allowed: ' . $host]);
        exit;
    }
    
    // Validate file extension (only allow images)
    $path = isset($parsedUrl['path']) ? strtolower($parsedUrl['path']) : '';
    $allowedExtensions = ['.gif', '.png', '.jpg', '.jpeg', '.webp'];
    $validExtension = false;
    foreach ($allowedExtensions as $ext) {
        if (str_ends_with($path, $ext)) {
            $validExtension = true;
            break;
        }
    }
    
    if (!$validExtension) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type. Only images allowed.']);
        exit;
    }
    
    // Make request for the image
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $imageUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FRESH_CONNECT => true,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_HTTPHEADER => [
            'Accept: image/gif, image/png, image/jpeg, image/webp, */*',
            'User-Agent: CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)'
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error = curl_error($ch);
    curl_close($ch);
    
    // Handle errors
    if ($error) {
        header('Content-Type: application/json');
        http_response_code(502);
        echo json_encode(['error' => 'Proxy error: ' . $error]);
        exit;
    }
    
    if ($httpCode !== 200) {
        header('Content-Type: application/json');
        http_response_code($httpCode);
        echo json_encode(['error' => 'Upstream returned ' . $httpCode]);
        exit;
    }
    
    // Set appropriate content type for the image
    if ($contentType && strpos($contentType, 'image/') === 0) {
        header('Content-Type: ' . $contentType);
    } else {
        // Guess from extension
        $extMap = [
            '.gif' => 'image/gif',
            '.png' => 'image/png',
            '.jpg' => 'image/jpeg',
            '.jpeg' => 'image/jpeg',
            '.webp' => 'image/webp'
        ];
        foreach ($extMap as $ext => $mime) {
            if (str_ends_with($path, $ext)) {
                header('Content-Type: ' . $mime);
                break;
            }
        }
    }
    
    // Allow caching for 5 minutes (images don't change that often)
    header('Cache-Control: public, max-age=300');
    
    // Output the image
    echo $response;
    exit;
}

// =============================================================================
// AVWX API
// =============================================================================
if ($api === 'avwx') {
    header('Content-Type: application/json');
    
    // Validate AVWX endpoint (whitelist patterns)
    $avwxPatterns = [
        '/^metar\/[A-Z0-9]+$/i',           // metar/KBJC
        '/^taf\/[A-Z0-9]+$/i',             // taf/KBJC
        '/^station\/[A-Z0-9]+$/i',         // station/KBJC
        '/^station\/near\/[\d\.\-,]+$/',   // station/near/39.87,-104.94
        '/^notam\/[A-Z0-9]+$/i',           // notam/KBJC
    ];
    
    $validEndpoint = false;
    foreach ($avwxPatterns as $pattern) {
        if (preg_match($pattern, $endpoint)) {
            $validEndpoint = true;
            break;
        }
    }
    
    if (!$validEndpoint) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid AVWX endpoint: ' . $endpoint]);
        exit;
    }
    
    // Build AVWX URL
    $baseUrl = 'https://avwx.rest/api/' . $endpoint;
    
    // Forward query parameters except api and endpoint
    $params = $_GET;
    unset($params['api']);
    unset($params['endpoint']);
    unset($params['_t']);
    
    if (!empty($params)) {
        $baseUrl .= '?' . http_build_query($params);
    }
    
    // Fail clearly if the server has no AVWX token configured (rather than
    // sending an unauthenticated request that returns a confusing 401).
    if ($AVWX_TOKEN === '') {
        http_response_code(500);
        echo json_encode(['error' => 'AVWX token not configured on server (set the AVWX_TOKEN environment variable)']);
        exit;
    }

    // Make request with AVWX token
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $baseUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FRESH_CONNECT => true,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_HEADER => true,  // Include headers in response
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Authorization: Token ' . $AVWX_TOKEN,
            'User-Agent: CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)'
        ]
    ]);
    
} else {
    // =============================================================================
    // AWC API (default)
    // =============================================================================
    header('Content-Type: application/json');
    
    // Validate AWC endpoint
    $allowedEndpoints = [
        'metar', 'taf', 'pirep', 'stationinfo', 'airport', 
        'airsigmet', 'gairmet', 'cwa', 'sigmet', 'windtemp',
        'fcstdisc', 'afd', 'isigmet', 'airmet', 'navaid', 'fix', 'obstacle',
        'tfr'  // TFR support (may be blocked by hosting provider WAF)
    ];
    
    if (!in_array($endpoint, $allowedEndpoints)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid AWC endpoint: ' . $endpoint]);
        exit;
    }
    
    // Build AWC URL
    $baseUrl = 'https://aviationweather.gov/api/data/' . $endpoint;
    
    // Forward query parameters except api, endpoint, and cache buster
    $params = $_GET;
    unset($params['api']);
    unset($params['endpoint']);
    unset($params['_t']);
    
    if (!empty($params)) {
        $baseUrl .= '?' . http_build_query($params);
    }
    
    // Some endpoints return text/plain (fcstdisc, areafcst, afd)
    $textEndpoints = ['fcstdisc', 'areafcst', 'mis', 'afd'];
    $acceptHeader = in_array($endpoint, $textEndpoints) ? 'text/plain, application/json' : 'application/json';
    
    // Make request
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $baseUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FRESH_CONNECT => true,
        CURLOPT_FORBID_REUSE => true,
        CURLOPT_HEADER => true,  // Include headers in response
        CURLOPT_HTTPHEADER => [
            'Accept: ' . $acceptHeader,
            'User-Agent: CAP-MAT/1.0 (Civil Air Patrol Mission Analysis Tool)',
            'Cache-Control: no-cache'
        ]
    ]);
}

// Execute request (for AVWX and AWC)
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);

curl_close($ch);

// Handle errors
if ($error) {
    http_response_code(502);
    echo json_encode(['error' => 'Proxy error: ' . $error]);
    exit;
}

// Split headers from body
$body = substr($response, $headerSize);

// Set appropriate content type (pass through from upstream)
if ($contentType) {
    header('Content-Type: ' . $contentType);
} else {
    header('Content-Type: application/json');
}

// Return the response with the same status code
http_response_code($httpCode);
echo $body;
?>
