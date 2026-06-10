<?php
declare(strict_types=1);

function portal_load_env_file(string $path): array
{
    if (!is_file($path) || !is_readable($path)) {
        return array();
    }

    $values = array();
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return array();
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }

        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        $value = trim($value, "\"'");
        if ($key !== '') {
            $values[$key] = $value;
        }
    }

    return $values;
}

$portalEnv = portal_load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env.local');

$supabaseUrl = getenv('VITE_SUPABASE_URL') ?: ($portalEnv['VITE_SUPABASE_URL'] ?? '');
$supabaseKey = getenv('VITE_SUPABASE_PUBLISHABLE_KEY') ?: ($portalEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? '');

return array(
    'supabase_url' => rtrim($supabaseUrl, '/'),
    'supabase_key' => $supabaseKey,
);
