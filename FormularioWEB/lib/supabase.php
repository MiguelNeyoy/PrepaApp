<?php
declare(strict_types=1);

function supabase_request(array $config, string $table, string $method = 'GET', array $payload = null, string $query = ''): array
{
    if ($config['supabase_url'] === '' || $config['supabase_key'] === '') {
        return array(
            'ok' => false,
            'status' => 0,
            'data' => null,
            'error' => array('message' => 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.'),
        );
    }

    $url = $config['supabase_url'] . '/rest/v1/' . rawurlencode($table);
    if ($query !== '') {
        $url .= '?' . $query;
    }

    $headers = array(
        'apikey: ' . $config['supabase_key'],
        'Authorization: Bearer ' . $config['supabase_key'],
        'Content-Type: application/json',
    );

    if ($method === 'POST') {
        $headers[] = 'Prefer: return=minimal';
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    }

    $body = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) {
        return array(
            'ok' => false,
            'status' => 0,
            'data' => null,
            'error' => array('message' => $curlError !== '' ? $curlError : 'No se pudo conectar con Supabase.'),
        );
    }

    $decoded = null;
    if ($body !== '') {
        $decoded = json_decode($body, true);
    }

    $ok = $status >= 200 && $status < 300;
    return array(
        'ok' => $ok,
        'status' => $status,
        'data' => $ok ? $decoded : null,
        'error' => $ok ? null : (is_array($decoded) ? $decoded : array('message' => $body)),
    );
}

function supabase_select_active(array $config, string $table, string $select, string $order): array
{
    $query = http_build_query(array(
        'select' => $select,
        'activo' => 'eq.true',
        'order' => $order,
    ));

    return supabase_request($config, $table, 'GET', null, $query);
}

function supabase_rpc(array $config, string $functionName, array $payload): array
{
    if ($config['supabase_url'] === '' || $config['supabase_key'] === '') {
        return array(
            'ok' => false,
            'status' => 0,
            'data' => null,
            'error' => array('message' => 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.'),
        );
    }

    $url = $config['supabase_url'] . '/rest/v1/rpc/' . rawurlencode($functionName);
    $headers = array(
        'apikey: ' . $config['supabase_key'],
        'Authorization: Bearer ' . $config['supabase_key'],
        'Content-Type: application/json',
    );

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $body = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($body === false) {
        return array(
            'ok' => false,
            'status' => 0,
            'data' => null,
            'error' => array('message' => $curlError !== '' ? $curlError : 'No se pudo conectar con Supabase.'),
        );
    }

    $decoded = null;
    if ($body !== '') {
        $decoded = json_decode($body, true);
    }

    $ok = $status >= 200 && $status < 300;
    return array(
        'ok' => $ok,
        'status' => $status,
        'data' => $ok ? $decoded : null,
        'error' => $ok ? null : (is_array($decoded) ? $decoded : array('message' => $body)),
    );
}

function supabase_error_message(array $result): string
{
    $error = $result['error'] ?? array();
    if (isset($error['code']) && $error['code'] === '23505') {
        return 'Ya existe una solicitud activa para esta matricula. Podras enviar otra cuando la anterior sea aceptada.';
    }

    if (isset($error['message']) && is_string($error['message']) && $error['message'] !== '') {
        return $error['message'];
    }

    return 'No se pudo guardar la solicitud. Intenta de nuevo.';
}
