<?php
/**
 * Local secrets template for the weather proxy.
 *
 * SETUP:
 *   1. Copy this file to  api/secrets.php  (same directory).
 *   2. Paste your real AVWX token below.
 *   3. Do NOT commit api/secrets.php — it is git-ignored on purpose.
 *
 * Prefer a real server environment variable (AVWX_TOKEN) in production; this
 * file is the fallback for local development or hosts without env-var support.
 * It returns an array (no output), so a direct web request to it reveals nothing.
 */
return [
    'AVWX_TOKEN' => 'paste-your-avwx-token-here',
];
