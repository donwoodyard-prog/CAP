<?php
/**
 * TFR Proxy Test Script
 * Upload to: /api/test-tfr-proxy.php
 * Access: https://cap-mat.com/api/test-tfr-proxy.php
 * 
 * This will show you exactly what's happening
 */

header('Content-Type: text/html; charset=utf-8');
header('Access-Control-Allow-Origin: *');

?>
<!DOCTYPE html>
<html>
<head>
    <title>TFR Proxy Test</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a202c; color: #e2e8f0; }
        .pass { color: #68d391; }
        .fail { color: #fc8181; }
        .info { color: #63b3ed; }
        pre { background: #2d3748; padding: 15px; border-radius: 5px; overflow-x: auto; }
        h2 { color: #63b3ed; border-bottom: 2px solid #4a5568; padding-bottom: 10px; }
        .test { margin: 20px 0; padding: 15px; background: #2d3748; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔍 TFR Proxy Diagnostic Test</h1>
    <p class="info">Testing TFR endpoint support in weather-proxy.php</p>

    <?php
    // Test 1: Check if weather-proxy.php exists
    echo '<div class="test">';
    echo '<h2>Test 1: File Existence</h2>';
    $proxyPath = __DIR__ . '/weather-proxy.php';
    if (file_exists($proxyPath)) {
        echo '<p class="pass">✓ weather-proxy.php exists at: ' . $proxyPath . '</p>';
    } else {
        echo '<p class="fail">✗ weather-proxy.php NOT FOUND at: ' . $proxyPath . '</p>';
        echo '<p>Check file location!</p>';
    }
    echo '</div>';

    // Test 2: Check file permissions
    echo '<div class="test">';
    echo '<h2>Test 2: File Permissions</h2>';
    if (file_exists($proxyPath)) {
        $perms = substr(sprintf('%o', fileperms($proxyPath)), -4);
        echo '<p class="info">Permissions: ' . $perms . '</p>';
        if (is_readable($proxyPath)) {
            echo '<p class="pass">✓ File is readable</p>';
        } else {
            echo '<p class="fail">✗ File is NOT readable</p>';
        }
    }
    echo '</div>';

    // Test 3: Check file content for 'tfr'
    echo '<div class="test">';
    echo '<h2>Test 3: TFR Endpoint in Code</h2>';
    if (file_exists($proxyPath)) {
        $content = file_get_contents($proxyPath);
        
        // Look for allowedEndpoints array
        if (preg_match('/\$allowedEndpoints\s*=\s*\[(.*?)\];/s', $content, $matches)) {
            $endpointsArray = $matches[1];
            
            echo '<p class="info">Found allowedEndpoints array:</p>';
            echo '<pre>' . htmlspecialchars($matches[0]) . '</pre>';
            
            if (strpos($endpointsArray, "'tfr'") !== false || strpos($endpointsArray, '"tfr"') !== false) {
                echo '<p class="pass">✓ "tfr" IS in allowed endpoints!</p>';
            } else {
                echo '<p class="fail">✗ "tfr" NOT in allowed endpoints</p>';
                echo '<p>You need to add "tfr" to the $allowedEndpoints array</p>';
            }
        } else {
            echo '<p class="fail">✗ Could not find $allowedEndpoints array</p>';
        }
        
        // Also check for TFR-specific URL handling
        if (strpos($content, "endpoint === 'tfr'") !== false || strpos($content, 'endpoint === "tfr"') !== false) {
            echo '<p class="pass">✓ TFR-specific URL handling code found</p>';
        } else {
            echo '<p class="fail">✗ TFR-specific URL handling code NOT found</p>';
            echo '<p>Missing: if ($endpoint === "tfr") { ... }</p>';
        }
    }
    echo '</div>';

    // Test 4: Test actual proxy call
    echo '<div class="test">';
    echo '<h2>Test 4: Live Proxy Test</h2>';
    
    $testUrl = 'http' . (isset($_SERVER['HTTPS']) ? 's' : '') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/weather-proxy.php?api=awc&endpoint=tfr&hours=24';
    
    echo '<p class="info">Testing URL: <a href="' . htmlspecialchars($testUrl) . '" target="_blank">' . htmlspecialchars($testUrl) . '</a></p>';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $error = curl_error($ch);
    curl_close($ch);
    
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);
    
    echo '<p class="info">HTTP Status Code: <strong>' . $httpCode . '</strong></p>';
    
    if ($httpCode == 200) {
        echo '<p class="pass">✓ SUCCESS! Proxy returned 200 OK</p>';
        echo '<p>Response preview (first 500 chars):</p>';
        echo '<pre>' . htmlspecialchars(substr($body, 0, 500)) . '...</pre>';
    } elseif ($httpCode == 403) {
        echo '<p class="fail">✗ FAILED with 403 Forbidden</p>';
        echo '<p>Response:</p>';
        echo '<pre>' . htmlspecialchars($body) . '</pre>';
        echo '<p><strong>This means:</strong> The proxy is rejecting "tfr" as invalid endpoint</p>';
        echo '<p><strong>Solution:</strong> File may not be updated or PHP cache needs clearing</p>';
    } else {
        echo '<p class="fail">✗ Unexpected status code: ' . $httpCode . '</p>';
        echo '<pre>' . htmlspecialchars($body) . '</pre>';
    }
    
    if ($error) {
        echo '<p class="fail">cURL Error: ' . htmlspecialchars($error) . '</p>';
    }
    echo '</div>';

    // Test 5: PHP Version
    echo '<div class="test">';
    echo '<h2>Test 5: PHP Environment</h2>';
    echo '<p class="info">PHP Version: ' . phpversion() . '</p>';
    echo '<p class="info">OPcache Enabled: ' . (function_exists('opcache_get_status') && opcache_get_status() ? 'Yes' : 'No') . '</p>';
    if (function_exists('opcache_get_status') && opcache_get_status()) {
        echo '<p class="fail">⚠️  OPcache is enabled - old file might be cached!</p>';
        echo '<p><strong>Solution:</strong> Restart PHP-FPM or clear OPcache</p>';
    }
    echo '</div>';

    // Recommendations
    echo '<div class="test">';
    echo '<h2>📋 Recommendations</h2>';
    
    if ($httpCode == 403) {
        echo '<ol>';
        echo '<li><strong>Clear PHP Cache:</strong> <code>sudo systemctl restart php-fpm</code></li>';
        echo '<li><strong>Verify File:</strong> Check that weather-proxy.php actually has "tfr" in $allowedEndpoints</li>';
        echo '<li><strong>Re-upload:</strong> Upload weather-proxy-with-tfr.php again</li>';
        echo '<li><strong>Check Logs:</strong> Look in PHP error logs for details</li>';
        echo '</ol>';
    } elseif ($httpCode == 200) {
        echo '<p class="pass">✓ Everything looks good! TFR endpoint is working!</p>';
        echo '<p>Your JavaScript should now be able to fetch TFRs successfully.</p>';
    }
    echo '</div>';
    ?>

    <hr>
    <p><small>Generated: <?php echo date('Y-m-d H:i:s'); ?></small></p>
</body>
</html>
