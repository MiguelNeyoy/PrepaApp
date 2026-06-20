<?php
declare(strict_types=1);

require __DIR__ . '/lib/supabase.php';
require __DIR__ . '/lib/validation.php';

$config = require __DIR__ . '/config.php';

function empty_old(array $catalogos = array(), string $matricula = ''): array
{
    $tramites = isset($catalogos['tramites']) ? $catalogos['tramites'] : array();
    $niveles = isset($catalogos['niveles']) ? $catalogos['niveles'] : array();

    return array(
        'matricula' => $matricula,
        'tramite_id' => isset($tramites[0]['id']) ? (string) $tramites[0]['id'] : '',
        'nivel_id' => isset($niveles[0]['id']) ? (string) $niveles[0]['id'] : '',
    );
}

function load_catalogos(array $config): array
{
    $catalogResults = array(
        'niveles' => supabase_select_active($config, 'niveles_estudio', 'id,nombre,abreviatura,pago_mxn,color_hex,orden,activo', 'orden.asc'),
        'facultades' => supabase_select_active($config, 'facultades', 'codigo,nombre,activo', 'codigo.asc'),
        'carreras' => supabase_select_active($config, 'carreras', 'id,facultad_codigo,nivel_id,nombre,activo', 'nombre.asc'),
        'tramites' => supabase_select_active($config, 'tramites', 'id,nombre,activo', 'nombre.asc'),
    );

    $catalogErrors = array();
    $catalogos = array(
        'niveles' => array(),
        'facultades' => array(),
        'carreras' => array(),
        'tramites' => array(),
    );

    foreach ($catalogResults as $key => $result) {
        if (!$result['ok']) {
            $catalogErrors[] = 'No se pudo cargar el catalogo: ' . $key . '.';
            continue;
        }
        $catalogos[$key] = is_array($result['data']) ? $result['data'] : array();
    }

    return array($catalogos, $catalogErrors);
}

$errors = array();
$catalogErrors = array();
$catalogos = array(
    'niveles' => array(),
    'facultades' => array(),
    'carreras' => array(),
    'tramites' => array(),
);
$old = empty_old();
$showForm = false;
$success = false;
$matriculaVerificada = '';
$submitted = $_SERVER['REQUEST_METHOD'] === 'POST';
$action = $submitted ? form_value($_POST, 'action') : '';

if ($submitted && $action === 'check_matricula') {
    $matricula = normalize_matricula(form_value($_POST, 'matricula'));
    $matriculaVerificada = $matricula;

    if (!is_valid_matricula($matricula)) {
        $errors[] = 'La matricula debe tener 7 digitos, guion y digito final.';
    } else {
        $check = supabase_rpc($config, 'portal_matricula_tiene_solicitud_activa', array('p_matricula' => $matricula));
        if (!$check['ok']) {
            $errors[] = 'No se pudo verificar la matricula. Intenta de nuevo.';
        } elseif ($check['data'] === true) {
            $errors[] = 'Ya existe una solicitud activa para esta matricula.';
        } else {
            list($catalogos, $catalogErrors) = load_catalogos($config);
            $old = empty_old($catalogos, $matricula);
            $showForm = empty($catalogErrors);
        }
    }
} elseif ($submitted && $action === 'submit_request') {
    list($catalogos, $catalogErrors) = load_catalogos($config);
    $old = $_POST;
    $old['matricula'] = normalize_matricula(form_value($_POST, 'matricula'));
    $matriculaVerificada = $old['matricula'];
    $showForm = true;

    if (empty($catalogErrors)) {
        list($errors, $payload) = validate_submission($old, $catalogos);

        if (empty($errors)) {
            $result = supabase_request($config, 'solicitudes_titulacion', 'POST', $payload);
            if ($result['ok']) {
                $success = true;
                $showForm = false;
                $old = empty_old();
            } else {
                $errors[] = supabase_error_message($result);
            }
        }
    }
}

$catalogJson = json_encode(array(
    'carreras' => $catalogos['carreras'],
), JSON_UNESCAPED_SLASHES);
if ($catalogJson === false) {
    $catalogJson = '{"carreras":[]}';
}
?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solicitud de Titulacion</title>
  <link rel="stylesheet" href="assets/styles.css">
  <script>
    window.PORTAL_CATALOGOS = <?php echo $catalogJson; ?>;
  </script>
</head>
<body>
  <main class="page">
    <?php if ($success): ?>
      <section class="success-screen">
        <img src="assets/uas.png" alt="UAS" class="success-logo">
        <p class="eyebrow">Solicitud enviada</p>
        <h1>Tu registro se guardo correctamente.</h1>
        <p>El personal de titulacion revisara tu solicitud.</p>
      </section>
    <?php else: ?>
      <section class="shell">
        <header class="header">
          <div class="brand">
            <img src="assets/uas.png" alt="UAS" class="brand-logo">
            <div>
              <p class="eyebrow">Universidad Autonoma de Sinaloa</p>
              <h1>Solicitud de Titulacion</h1>
            </div>
          </div>
        </header>

        <?php if (!empty($catalogErrors)): ?>
          <div class="notice notice-error">
            <?php foreach ($catalogErrors as $message): ?>
              <p><?php echo h($message); ?></p>
            <?php endforeach; ?>
            <p>Revisa la conexion y las variables de Supabase antes de continuar.</p>
          </div>
        <?php endif; ?>

        <?php if (!empty($errors)): ?>
          <div class="notice notice-error">
            <strong>No se pudo continuar.</strong>
            <?php foreach ($errors as $message): ?>
              <p><?php echo h($message); ?></p>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>

        <?php if (!$showForm): ?>
          <form method="post" class="form wizard-check" novalidate>
            <fieldset>
              <input type="hidden" name="action" value="check_matricula">
              <div class="section-title">Verificacion inicial</div>
              <label class="field field-wide">
                <span>Matricula<b>*</b></span>
                <input name="matricula" class="matricula" value="<?php echo h($matriculaVerificada); ?>" required pattern="[0-9]{7}-[0-9]" placeholder="Ingresa tu matricula" inputmode="numeric" maxlength="9">
              </label>
              <div class="actions wizard-actions">
                <button type="submit" class="action-button" data-loading-text="Verificando...">
                  <span class="button-label">Continuar</span>
                  <span class="loading-spinner" aria-hidden="true"></span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="button-icon">
                    <path d="M5 12h14"></path>
                    <path d="m13 6 6 6-6 6"></path>
                  </svg>
                </button>
              </div>
            </fieldset>
          </form>
        <?php else: ?>
          <form method="post" class="form" novalidate>
            <fieldset <?php echo !empty($catalogErrors) ? 'disabled' : ''; ?>>
              <input type="hidden" name="action" value="submit_request">
              <div class="section-title">Datos del alumno</div>

              <label class="field">
                <span>Matricula <b>*</b></span>
                <input name="matricula" class="matricula locked-input" value="<?php echo h(form_value($old, 'matricula')); ?>" readonly required pattern="[0-9]{7}-[0-9]" inputmode="numeric" maxlength="9">
              </label>

              <label class="field field-wide">
                <span>Nombre completo <b>*</b></span>
                <input name="alumno_nombre" value="<?php echo h(form_value($old, 'alumno_nombre')); ?>" required placeholder="Ingresa tu nombre completo">
              </label>

              <label class="field">
                <span>Correo electronico <b>*</b></span>
                <input name="alumno_email" type="email" value="<?php echo h(form_value($old, 'alumno_email')); ?>" required placeholder="Ingresa tu correo electronico">
              </label>

              <label class="field">
                <span>Telefono personal <b>*</b></span>
                <input name="telefono" class="digits-only" value="<?php echo h(form_value($old, 'telefono')); ?>" required placeholder="Ingresa tu telefono personal" inputmode="numeric">
              </label>

              <label class="field">
                <span>Telefono alternativo</span>
                <input name="telefono_alternativo" class="digits-only" value="<?php echo h(form_value($old, 'telefono_alternativo')); ?>" placeholder="Ingresa un telefono alternativo" inputmode="numeric">
              </label>

              <div class="section-title">Programa academico</div>

              <label class="field">
                <span>Nivel <b>*</b></span>
                <select name="nivel_id" id="nivel_id" required>
                  <option value="">Seleccionar nivel</option>
                  <?php foreach ($catalogos['niveles'] as $nivel): ?>
                    <option value="<?php echo h($nivel['id']); ?>" <?php echo form_value($old, 'nivel_id') === (string) $nivel['id'] ? 'selected' : ''; ?>>
                      <?php echo h($nivel['nombre']); ?>
                    </option>
                  <?php endforeach; ?>
                </select>
              </label>

              <label class="field">
                <span>Facultad <b>*</b></span>
                <select name="facultad_codigo" id="facultad_codigo" required>
                  <option value="">Seleccionar facultad</option>
                  <?php foreach ($catalogos['facultades'] as $facultad): ?>
                    <option value="<?php echo h($facultad['codigo']); ?>" <?php echo form_value($old, 'facultad_codigo') === (string) $facultad['codigo'] ? 'selected' : ''; ?>>
                      <?php echo h($facultad['nombre']); ?>
                    </option>
                  <?php endforeach; ?>
                </select>
              </label>

              <label class="field field-wide">
                <span>Carrera <b>*</b></span>
                <select name="carrera_id" id="carrera_id" data-selected="<?php echo h(form_value($old, 'carrera_id')); ?>" required>
                  <option value="">Selecciona nivel y facultad primero</option>
                </select>
              </label>

              <div class="section-title">Documentacion</div>

              <label class="field">
                <span>Tramite <b>*</b></span>
                <select name="tramite_id" required>
                  <option value="">Seleccionar tramite</option>
                  <?php foreach ($catalogos['tramites'] as $tramite): ?>
                    <option value="<?php echo h($tramite['id']); ?>" <?php echo form_value($old, 'tramite_id') === (string) $tramite['id'] ? 'selected' : ''; ?>>
                      <?php echo h($tramite['nombre']); ?>
                    </option>
                  <?php endforeach; ?>
                </select>
              </label>

              <label class="field">
                <span>Generacion de bachillerato <b>*</b></span>
                <input name="generacion_prepa" class="generation" value="<?php echo h(form_value($old, 'generacion_prepa')); ?>" required placeholder="Ingresa el periodo" inputmode="numeric" maxlength="9">
              </label>

              <label class="field">
                <span>Generacion de licenciatura <b>*</b></span>
                <input name="generacion_licenciatura" class="generation" value="<?php echo h(form_value($old, 'generacion_licenciatura')); ?>" required placeholder="Ingresa el periodo" inputmode="numeric" maxlength="9">
              </label>

              <div class="field field-wide">
                <span>Tu bachillerato/preparatoria fue en la UAS? <b>*</b></span>
                <div class="choice-group">
                  <label class="choice-option">
                    <input type="radio" name="prepa_uas" value="1" required <?php echo form_value($old, 'prepa_uas') === '1' ? 'checked' : ''; ?>>
                    <span>Si, UAS</span>
                  </label>
                  <label class="choice-option">
                    <input type="radio" name="prepa_uas" value="0" required <?php echo form_value($old, 'prepa_uas') === '0' ? 'checked' : ''; ?>>
                    <span>No, otra institucion</span>
                  </label>
                </div>
              </div>

              <div class="actions">
                <a href="<?php echo h($_SERVER['PHP_SELF']); ?>" class="secondary-action action-button">
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="button-icon">
                    <path d="M19 12H5"></path>
                    <path d="m11 18-6-6 6-6"></path>
                  </svg>
                  <span>Regresar</span>
                </a>
                <button type="submit" class="action-button" data-loading-text="Enviando...">
                  <span class="button-label">Enviar solicitud</span>
                  <span class="loading-spinner" aria-hidden="true"></span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="button-icon">
                    <path d="M22 2 11 13"></path>
                    <path d="m22 2-7 20-4-9-9-4 20-7z"></path>
                  </svg>
                </button>
              </div>
            </fieldset>
          </form>
        <?php endif; ?>
      </section>
    <?php endif; ?>
  </main>
  <script src="assets/app.js"></script>
</body>
</html>
