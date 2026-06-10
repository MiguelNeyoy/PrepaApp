<?php
declare(strict_types=1);

function h($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function form_value(array $source, string $key, string $default = ''): string
{
    return isset($source[$key]) ? (string) $source[$key] : $default;
}

function normalize_matricula(string $value): string
{
    return strtoupper(preg_replace('/\s+/', '', trim($value)) ?? '');
}

function normalize_generation(string $value): string
{
    $digits = preg_replace('/\D+/', '', $value) ?? '';
    $digits = substr($digits, 0, 8);
    if (strlen($digits) <= 4) {
        return $digits;
    }

    return substr($digits, 0, 4) . '-' . substr($digits, 4);
}

function is_valid_matricula(string $value): bool
{
    return preg_match('/^[0-9]{7}-[0-9]$/', $value) === 1;
}

function is_valid_email(string $value): bool
{
    return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
}

function is_valid_phone(string $value): bool
{
    return preg_match('/^[0-9]{7,20}$/', $value) === 1;
}

function find_by_id(array $items, string $key, string $value): ?array
{
    foreach ($items as $item) {
        if (isset($item[$key]) && (string) $item[$key] === $value) {
            return $item;
        }
    }

    return null;
}

function validate_submission(array $input, array $catalogos): array
{
    $errors = array();

    $matricula = normalize_matricula(form_value($input, 'matricula'));
    $nombre = trim(form_value($input, 'alumno_nombre'));
    $email = trim(form_value($input, 'alumno_email'));
    $telefono = trim(form_value($input, 'telefono'));
    $telefonoAlt = trim(form_value($input, 'telefono_alternativo'));
    $tramiteId = trim(form_value($input, 'tramite_id'));
    $nivelId = trim(form_value($input, 'nivel_id'));
    $facultadCodigo = trim(form_value($input, 'facultad_codigo'));
    $carreraId = trim(form_value($input, 'carrera_id'));
    $prepa = normalize_generation(form_value($input, 'generacion_prepa'));
    $lic = normalize_generation(form_value($input, 'generacion_licenciatura'));

    if (!is_valid_matricula($matricula)) {
        $errors[] = 'La matricula debe tener 7 digitos, guion y digito final.';
    }
    if ($nombre === '') {
        $errors[] = 'Captura el nombre completo.';
    }
    if (!is_valid_email($email)) {
        $errors[] = 'Captura un correo valido.';
    }
    if (!is_valid_phone($telefono)) {
        $errors[] = 'Captura un telefono valido.';
    }
    if ($telefonoAlt !== '' && !is_valid_phone($telefonoAlt)) {
        $errors[] = 'Captura un telefono alternativo valido o dejalo vacio.';
    }
    if ($prepa === '' || strlen($prepa) !== 9) {
        $errors[] = 'Captura la generacion de bachillerato con formato aaaa-aaaa.';
    }
    if ($lic === '' || strlen($lic) !== 9) {
        $errors[] = 'Captura la generacion de licenciatura con formato aaaa-aaaa.';
    }
    if (!isset($input['prepa_uas']) || !in_array((string) $input['prepa_uas'], array('0', '1'), true)) {
        $errors[] = 'Indica si tu bachillerato/preparatoria fue en la UAS.';
    }

    $tramite = find_by_id($catalogos['tramites'], 'id', $tramiteId);
    $nivel = find_by_id($catalogos['niveles'], 'id', $nivelId);
    $facultad = find_by_id($catalogos['facultades'], 'codigo', $facultadCodigo);
    $carrera = find_by_id($catalogos['carreras'], 'id', $carreraId);

    if ($tramite === null) {
        $errors[] = 'Selecciona un tramite valido.';
    }
    if ($nivel === null) {
        $errors[] = 'Selecciona un nivel valido.';
    }
    if ($facultad === null) {
        $errors[] = 'Selecciona una facultad valida.';
    }
    if ($carrera === null) {
        $errors[] = 'Selecciona una carrera valida.';
    } elseif (
        (string) $carrera['facultad_codigo'] !== $facultadCodigo ||
        (string) $carrera['nivel_id'] !== $nivelId
    ) {
        $errors[] = 'La carrera no corresponde al nivel y facultad seleccionados.';
    }

    $payload = array(
        'matricula' => $matricula,
        'alumno_nombre' => $nombre,
        'alumno_email' => $email,
        'telefono' => $telefono,
        'telefono_alternativo' => $telefonoAlt !== '' ? $telefonoAlt : null,
        'tramite_id' => $tramiteId,
        'nivel_id' => $nivelId,
        'facultad_codigo' => $facultadCodigo,
        'carrera_id' => $carreraId,
        'prepa_uas' => isset($input['prepa_uas']) && (string) $input['prepa_uas'] === '1',
        'generacion_prepa' => $prepa,
        'generacion_licenciatura' => $lic,
    );

    return array($errors, $payload);
}
