<?php
/**
 * Plugin Name: Floating Widget
 * Description: Agente de búsqueda conversacional Neto
 * Version: 4.4.3
 * Author: Saul
 */

if (!defined('ABSPATH')) exit;

// SCRIPTS DE ADMINISTRACIÓN (Lógica del Panel)
function nfw_admin_scripts($hook) {
    if ('toplevel_page_nfw-config' !== $hook) return;

    // Sintaxis Heredoc limpia
    $custom_js = <<<JS
        jQuery(document).ready(function($){
            // Sin funcionalidad de imágenes — sección eliminada
        });
JS;

    wp_add_inline_script('jquery-core', $custom_js);
}
add_action('admin_enqueue_scripts', 'nfw_admin_scripts');

//  MENÚ Y REGISTRO DE OPCIONES
function nfw_add_admin_menu() {
    add_menu_page('Configuración Chatbot', 'Chatbot Neto', 'manage_options', 'nfw-config', 'nfw_settings_page_html', 'dashicons-format-chat', '100');
}
add_action('admin_menu', 'nfw_add_admin_menu');

// Función para sanitizar (limpiar) los campos antes de guardarlos en BD
function nfw_sanitize_settings($input) {
    $sanitized = array();
    if (isset($input) && is_array($input)) {
        foreach ($input as $key => $value) {
            // Elimina etiquetas HTML, scripts y caracteres peligrosos (Permite URLs)
            $sanitized[$key] = sanitize_text_field($value); 
        }
    }
    return $sanitized;
}

function nfw_contact_section_description() {
    ?>
    <div style="background:#f0f6fc;border-left:4px solid #4285F4;padding:14px 18px;margin:10px 0 18px;font-size:13px;line-height:1.7;border-radius:0 4px 4px 0;">
        <strong style="display:block;margin-bottom:8px;">Ejemplos de valores para cada campo:</strong>
        <table style="border-collapse:collapse;width:100%;max-width:640px;">
            <tr>
                <td style="padding:3px 14px 3px 0;color:#555;white-space:nowrap;font-weight:600;">Teléfono</td>
                <td><code style="background:#e8f0fe;padding:2px 6px;border-radius:3px;">612 345 678</code></td>
            </tr>
            <tr>
                <td style="padding:3px 14px 3px 0;color:#555;font-weight:600;">Email</td>
                <td><code style="background:#e8f0fe;padding:2px 6px;border-radius:3px;">info@desguacesejemplo.com</code></td>
            </tr>
            <tr>
                <td style="padding:3px 14px 3px 0;color:#555;font-weight:600;">Google Maps</td>
                <td><code style="background:#e8f0fe;padding:2px 6px;border-radius:3px;">https://maps.google.com/?q=Calle+Ejemplo+12,+Madrid</code></td>
            </tr>
            <tr>
                <td style="padding:3px 14px 3px 0;color:#555;font-weight:600;">Sobre nosotros</td>
                <td><code style="background:#e8f0fe;padding:2px 6px;border-radius:3px;">https://midominio.com/sobre-nosotros</code></td>
            </tr>
            <tr>
                <td style="padding:3px 14px 3px 0;color:#555;font-weight:600;">Bajas y tasaciones</td>
                <td><code style="background:#e8f0fe;padding:2px 6px;border-radius:3px;">https://midominio.com/bajas-y-tasaciones</code></td>
            </tr>
            <tr>
                <td style="padding:3px 14px 3px 0;color:#555;font-weight:600;">Horario</td>
                <td><code style="background:#e8f0fe;padding:2px 6px;border-radius:3px;">Lun&ndash;Vie 9:00&ndash;18:00 | Sáb 9:00&ndash;14:00</code></td>
            </tr>
        </table>
        <p style="margin:10px 0 0;color:#666;font-style:italic;">Deja en blanco los campos que no quieras mostrar. El bot ocultará automáticamente los que no estén configurados.</p>
    </div>
    <?php
}

function nfw_settings_init() {
    try {
        //Evitar Call to undefined function
        if (!function_exists('add_settings_section')) {
            return; 
        }

        // Registramos usando nuestra función de sanitización
        register_setting('nfw_options_group', 'nfw_settings', 'nfw_sanitize_settings');

        // SECCIONES (Nombres intuitivos)
        add_settings_section('nfw_section_header', '1. Cabecera del Chat', null, 'nfw-config');
        add_settings_section('nfw_section_launcher', '2. Botón Flotante', null, 'nfw-config');
        add_settings_section('nfw_section_bubbles', '3. Textos y Burbujas de Conversación', null, 'nfw-config');
        add_settings_section('nfw_section_appearance', '4. Fondos y Detalles Secundarios', null, 'nfw-config');
        add_settings_section('nfw_section_input', '5. Controles Inferiores (Caja de Texto y Enviar)', null, 'nfw-config');
        add_settings_section('nfw_section_cards', '6. Tarjetas de Productos', null, 'nfw-config');
        add_settings_section('nfw_section_api', '7. Conexión al Servidor Inteligente', null, 'nfw-config');
        add_settings_section('nfw_section_newconv', '8. Botones de Cabecera (Reiniciar ↺ y Cerrar ✕)', null, 'nfw-config');
        add_settings_section('nfw_section_contact', '9. Datos de Contacto (Placeholders del bot)', 'nfw_contact_section_description', 'nfw-config');

        nfw_add_field('headerBg', 'Color de la Cabecera (Franja superior del chat)', 'color', 'nfw_section_header', '#99c355');
        nfw_add_field('headerTitleColor', 'Color del título en la cabecera', 'color', 'nfw_section_header', '#ffffff');
        nfw_add_field('headerTitleText', 'Título Principal (Ej: Soporte Recambios Neto)', 'text', 'nfw_section_header', 'Soporte Recambios');
        nfw_add_field('userDisplayName', 'Nombre que se le da al cliente (Ej: Tú, Invitado)', 'text', 'nfw_section_header', 'Tú');

        nfw_add_field('launcherBg', 'Color del fondo de la pastilla (Ej: Amarillo)', 'color', 'nfw_section_launcher', '#F5A623');
        nfw_add_field('launcherTitle', 'Título del botón (Texto superior en negrita)', 'text', 'nfw_section_launcher', 'Hola, soy Neto');
        nfw_add_field('launcherText', 'Subtítulo del botón (Texto inferior)', 'text', 'nfw_section_launcher', '¿Te ayudo a encontrar tu pieza?');
        nfw_add_field('launcherArrowColor', 'Color de la flechita de la derecha', 'color', 'nfw_section_launcher', '#000000');

        nfw_add_field('welcomeMessage', 'Mensaje inicial automático de bienvenida', 'text', 'nfw_section_bubbles', 'Buenas, ¿puedo ayudarle?');
        nfw_add_field('mensajeSinStock', 'Respuesta automática: "No hay stock"', 'text', 'nfw_section_bubbles', 'He revisado el almacén, pero no encuentro esa pieza en stock.');
        nfw_add_field('userBubbleBg', 'Color de la burbuja del Cliente (Envíos)', 'color', 'nfw_section_bubbles', '#99c355');
        nfw_add_field('userTextColor', 'Color del texto del Cliente', 'color', 'nfw_section_bubbles', '#ffffff');
        nfw_add_field('botBubbleBg', 'Color de la burbuja del Bot (Respuestas)', 'color', 'nfw_section_bubbles', '#e0e0e0');
        nfw_add_field('botTextColor', 'Color del texto del Bot', 'color', 'nfw_section_bubbles', '#000000');

        nfw_add_field('chatBodyBg', 'Color del fondo general del chat (Detrás de los mensajes)', 'color', 'nfw_section_appearance', '#f9f9f9');
        
        // Selector de tamaño
        nfw_add_field('chatSize', 'Tamaño de la ventana (Solo Ordenador)', 'select', 'nfw_section_appearance', 'medium', array(
            'small' => 'Pequeño',
            'medium' => 'Mediano (Actual / Por Defecto)',
            'large' => 'Grande'
        ));

        nfw_add_field('inputContainerBg', 'Color de la franja inferior (Donde van los botones)', 'color', 'nfw_section_appearance', '#ffffff');
        nfw_add_field('inputBorderColor', 'Color de la línea que separa los mensajes de la zona inferior', 'color', 'nfw_section_appearance', '#eeeeee');
        nfw_add_field('labelColor', 'Color del nombre del remitente (Letra pequeña sobre la burbuja)', 'color', 'nfw_section_appearance', '#65676b');
        nfw_add_field('timestampColor', 'Color de la hora de envío (Letra pequeña bajo la burbuja)', 'color', 'nfw_section_appearance', '#656565');

        nfw_add_field('inputBoxBg', 'Color de la barra de escritura (Donde aparece el cursor)', 'color', 'nfw_section_input', '#f4f4f4');
        nfw_add_field('inputFocusBorder', 'Color del borde al hacer clic para teclear (Efecto resaltado)', 'color', 'nfw_section_input', '#99c355');
        nfw_add_field('sendBtnBg', 'Color del botón de Enviar (Icono del avión)', 'color', 'nfw_section_input', '#99c355');
        nfw_add_field('badgeBg', 'Color de las notificaciones (Círculo con el número de mensajes no leídos)', 'color', 'nfw_section_input', '#ff0000');

        nfw_add_field('buyBtnText', 'Texto del botón de compra', 'text', 'nfw_section_cards', '🛒 Comprar');
        nfw_add_field('buyBtnBg', 'Color de fondo del botón de compra', 'color', 'nfw_section_cards', '#99c355');
        nfw_add_field('viewMoreBtnText', 'Texto botón "Ver más" (Usa "{total}" para número)', 'text', 'nfw_section_cards', 'Ver las {total} opciones');
        nfw_add_field('viewMoreBtnColor', 'Color del botón "Ver más"', 'color', 'nfw_section_cards', '#99c355');

        nfw_add_field('refineBtnText', 'Texto botón de opciones: "Seguir afinando"', 'text', 'nfw_section_cards', 'Seguir afinando');
        nfw_add_field('viewBtnText', 'Texto botón de opciones: "Ver resultados"', 'text', 'nfw_section_cards', 'Ver resultados');
        nfw_add_field('maxSuggestions', 'Número máximo de sugerencias (Por defecto: 10)', 'text', 'nfw_section_cards', '10');
        
        nfw_add_field('optionsBtnBg', 'Fondo de las opciones', 'color', 'nfw_section_cards', '#ffffff');
        nfw_add_field('optionsBtnColor', 'Color del texto de opciones', 'color', 'nfw_section_cards', '#333333');
        nfw_add_field('optionsBtnBorder', 'Color del borde de opciones', 'color', 'nfw_section_cards', '#e5e7eb');
        nfw_add_field('optionsBtnHoverBg', 'Fondo de opciones al pasar el ratón', 'color', 'nfw_section_cards', '#f3f4f6');

        nfw_add_field('backendUrl', 'URL del Backend', 'text', 'nfw_section_api', 'https://api.midominio.com/api/chat');
        nfw_add_field('baseUrl', 'URL base de la web (para enlaces a /recambios/). Si se deja en blanco usa la URL del propio WordPress', 'text', 'nfw_section_api', '');
        nfw_add_field('backendApiKey', 'Tu Clave de Acceso (API Key)', 'text', 'nfw_section_api', '');
        nfw_add_field('whatsappNumber', 'Número de WhatsApp (con prefijo, ej: 34600111222)', 'text', 'nfw_section_api', '');

        // Sección 8: Botones de Cabecera (Reiniciar y Cerrar)
        nfw_add_field('newConvEnabled', 'Mostrar botón Reiniciar (↺) en la cabecera', 'select', 'nfw_section_newconv', 'true', array(
            'true' => 'Sí (Visible)',
            'false' => 'No (Oculto)'
        ));
        nfw_add_field('newConvBg', 'Color de fondo de los botones ↺ y ✕ (estado normal)', 'color', 'nfw_section_newconv', 'rgba(0,0,0,0.15)');
        nfw_add_field('newConvColor', 'Color del icono de los botones ↺ y ✕', 'color', 'nfw_section_newconv', '#ffffff');
        nfw_add_field('newConvHoverBg', 'Color de fondo de los botones ↺ y ✕ (al pasar el ratón)', 'color', 'nfw_section_newconv', 'rgba(0,0,0,0.28)');
        nfw_add_field('newConvTooltip', 'Texto del tooltip del botón ↺ (al pasar el ratón)', 'text', 'nfw_section_newconv', 'Nueva búsqueda');

        nfw_add_field('telefono',         'Teléfono de contacto',                                           'text', 'nfw_section_contact', '');
        nfw_add_field('email',            'Email de contacto',                                              'text', 'nfw_section_contact', '');
        nfw_add_field('mapsUrl',          'URL de Google Maps',                                             'text', 'nfw_section_contact', '');
        nfw_add_field('sobreNosotrosUrl', 'URL página "Sobre Nosotros"',                                    'text', 'nfw_section_contact', '');
        nfw_add_field('bajasUrl',         'URL página "Bajas y Tasaciones"',                                'text', 'nfw_section_contact', '');
        nfw_add_field('horario',          'Horario de atención',                                            'text', 'nfw_section_contact', '');

    } catch (\Throwable $e) {
        //Atrapa errores 
        error_log('Error Crítico evitado en Chatbot Neto (Ajustes): ' . $e->getMessage());
    }
}

add_action('admin_init', 'nfw_settings_init');


// INICIO DE REST API Y ESTADÍSTICAS
function nfw_register_rest_endpoints() {
    register_rest_route('neto-bot/v1', '/track-click', array(
        'methods' => 'POST',
        'callback' => 'nfw_track_click_callback',
        'permission_callback' => function () {
            // Verificamos el nonce por seguridad
            $nonce = isset($_SERVER['HTTP_X_WP_NONCE']) ? sanitize_text_field($_SERVER['HTTP_X_WP_NONCE']) : '';
            return wp_verify_nonce($nonce, 'wp_rest');
        }
    ));
}
add_action('rest_api_init', 'nfw_register_rest_endpoints');

function nfw_track_click_callback(WP_REST_Request $request) {
    $body = $request->get_json_params();
    $action_type = isset($body['action_type']) ? sanitize_text_field($body['action_type']) : 'compra';

    if ($action_type === 'badge_open') {
        $current_opens = (int) get_option('neto_chatbot_opens', 0);
        update_option('neto_chatbot_opens', $current_opens + 1);
        return rest_ensure_response(array('success' => true, 'total_opens' => $current_opens + 1));
    } else {
        $current_clicks = (int) get_option('neto_chatbot_clicks', 0);
        update_option('neto_chatbot_clicks', $current_clicks + 1);
        return rest_ensure_response(array('success' => true, 'total' => $current_clicks + 1));
    }
}



function nfw_add_field($id, $title, $type, $section, $default, $choices = array()) {
    add_settings_field($id, $title, 'nfw_render_field', 'nfw-config', $section, array('label_for' => $id, 'type' => $type, 'default' => $default, 'choices' => $choices));
}

function nfw_render_field($args) {
    $options = get_option('nfw_settings');
    $id = $args['label_for'];
    $default = $args['default'];
    $value = isset($options[$id]) ? $options[$id] : $default;
    
    if ($args['type'] === 'color') {
        echo '<input type="color" name="nfw_settings[' . $id . ']" value="' . esc_attr($value) . '">';
    } elseif ($args['type'] === 'select') {
        echo '<select name="nfw_settings[' . $id . ']">';
        foreach ($args['choices'] as $val => $label) {
            $selected = ($value === $val) ? 'selected="selected"' : '';
            echo '<option value="' . esc_attr($val) . '" ' . $selected . '>' . esc_html($label) . '</option>';
        }
        echo '</select>';
    } elseif ($args['type'] === 'image') {
        echo '<div style="display: flex; align-items: flex-start; gap: 20px; background: #fff; padding: 15px; border: 1px solid #ccd0d4; border-radius: 4px;">';
            echo '<div style="text-align: center; width: 120px;">';
                $display = $value ? 'block' : 'none';
                echo '<img id="preview-' . esc_attr($id) . '" src="' . esc_attr($value) . '" style="max-width: 100px; max-height: 100px; display: ' . $display . '; border: 1px solid #ddd; margin-bottom: 5px; padding: 3px; object-fit: cover;">';
                echo '<small style="color: #666; display: block;">Vista previa</small>';
            echo '</div>';
            echo '<div style="flex: 1;">';
                echo '<input type="text" id="' . esc_attr($id) . '" name="nfw_settings[' . $id . ']" value="' . esc_attr($value) . '" style="width: 100%; margin-bottom: 10px;" placeholder="https://...">';
                echo '<div style="display: flex; gap: 10px;">';
                    echo '<button type="button" class="button nfw-preview-trigger" data-id="' . esc_attr($id) . '">Visualizar URL</button>';
                    echo '<button type="button" class="button button-primary nfw-upload-button" data-id="' . esc_attr($id) . '">Seleccionar de la Biblioteca</button>';
                echo '</div>';
                echo '<div style="margin-top: 10px; font-style: italic; font-size: 12px; color: #666;">';
                    echo $id === 'launcherIcon' ? '<strong>Recomendado:</strong> Imagen cuadrada o SVG. Se ajustará al círculo del botón.' : '<strong>Recomendado:</strong> Imagen cuadrada. Se usará para el avatar de los mensajes.';
                echo '</div>';
            echo '</div>';
        echo '</div>';
    } else {

        $maxlength = '255'; 
        
        if ($id === 'headerTitleText') $maxlength = '18'; 
        if ($id === 'userDisplayName') $maxlength = '18'; 
        if ($id === 'refineBtnText' || $id === 'viewBtnText') $maxlength = '30'; 
        if ($id === 'buyBtnText') $maxlength = '30'; 
        if ($id === 'viewMoreBtnText') $maxlength = '40'; 
        
        echo '<input type="text" style="width: 100%; max-width: 400px;" name="nfw_settings[' . $id . ']" value="' . esc_attr($value) . '" maxlength="' . $maxlength . '">';
    }
}

function nfw_settings_page_html() {
    if (!current_user_can('manage_options')) return;
    
    $total_clicks = (int) get_option('neto_chatbot_clicks', 0);
    $total_opens = (int) get_option('neto_chatbot_opens', 0);
    ?>
    <div class="wrap">
        <h1>Configuración visual del Chatbot</h1>
        
        <div style="background: #fff; border-left: 4px solid #99c355; box-shadow: 0 1px 1px rgba(0,0,0,.04); padding: 1px 12px; margin: 20px 0;">
            <p><strong>Estadísticas del Chatbot:</strong></p>
            <p style="font-size: 16px;">Clics para el carrito: <span style="font-weight: bold; padding: 2px 8px; background: #eee; border-radius: 4px;"><?php echo esc_html($total_clicks); ?></span></p>
            <p style="font-size: 16px;">Clics en el chatbot: <span style="font-weight: bold; padding: 2px 8px; background: #eee; border-radius: 4px;"><?php echo esc_html($total_opens); ?></span></p>
        </div>

        <p>Desde aquí puedes cambiar todos los colores y textos del chat sin tocar código.</p>
        <form action="options.php" method="post">
            <?php
            settings_fields('nfw_options_group');
            do_settings_sections('nfw-config');
            submit_button('Guardar todos los cambios');
            ?>
        </form>
    </div>
    <?php
}

// HELPER PARA LIMPIAR EL CÓDIGO
function nfw_get_val($options, $key, $default) {
    return !empty($options[$key]) ? $options[$key] : $default;
}

// CARGA DE FRONTEND (React)
function nfw_load_files() {
    try {
        $js_path_list = glob(plugin_dir_path(__FILE__) . 'build/assets/*.js');
        $css_path_list = glob(plugin_dir_path(__FILE__) . 'build/assets/*.css');

        if (!empty($js_path_list) && !empty($css_path_list)) {
            
            $js_url = plugin_dir_url(__FILE__) . 'build/assets/' . basename($js_path_list[0]);
            $css_url = plugin_dir_url(__FILE__) . 'build/assets/' . basename($css_path_list[0]);

            wp_enqueue_style('nfw-css', $css_url, array(), filemtime($css_path_list[0]));
            wp_enqueue_script('nfw-js', $js_url, array(), filemtime($js_path_list[0]), true);

            add_filter('script_loader_tag', function ($tag, $handle) {
                if ($handle === 'nfw-js') {
                    return str_replace('<script ', '<script type="module" data-no-minify="1" data-noptimize="1" data-cfasync="false" class="litespeed-no-delay" ', $tag);
                }
                return $tag;
            }, 10, 2);

            $options = get_option('nfw_settings') ?: array();
            
            $react_config = array(
                'headerBg'         => nfw_get_val($options, 'headerBg', '#99c355'),
                'headerTitleColor' => nfw_get_val($options, 'headerTitleColor', '#ffffff'),
                'headerTitleText'  => nfw_get_val($options, 'headerTitleText', 'Soporte Recambios'),
                'userDisplayName'  => nfw_get_val($options, 'userDisplayName', 'Tú'),
                'launcherBg'       => nfw_get_val($options, 'launcherBg', '#F5A623'),
                'launcherTitle'    => nfw_get_val($options, 'launcherTitle', 'Hola, soy Neto'),
                'launcherText'     => nfw_get_val($options, 'launcherText', '¿Te ayudo a encontrar tu pieza?'),
                'launcherArrowColor'=> nfw_get_val($options, 'launcherArrowColor', '#000000'),
                'welcomeMessage'   => nfw_get_val($options, 'welcomeMessage', 'Buenas, ¿puedo ayudarle?'),
                'mensajeSinStock'  => nfw_get_val($options, 'mensajeSinStock', 'He revisado el almacén, pero no encuentro esa pieza en stock.'),
                'userBubbleBg'     => nfw_get_val($options, 'userBubbleBg', '#99c355'),
                'userTextColor'    => nfw_get_val($options, 'userTextColor', '#ffffff'),
                'botBubbleBg'      => nfw_get_val($options, 'botBubbleBg', '#e0e0e0'),
                'botTextColor'     => nfw_get_val($options, 'botTextColor', '#000000'),
                'inputBoxBg'       => nfw_get_val($options, 'inputBoxBg', '#f4f4f4'),
                'inputFocusBorder' => nfw_get_val($options, 'inputFocusBorder', '#99c355'),
                'sendBtnBg'        => nfw_get_val($options, 'sendBtnBg', '#99c355'),
                'badgeBg'          => nfw_get_val($options, 'badgeBg', '#ff0000'),
                'chatBodyBg'       => nfw_get_val($options, 'chatBodyBg', '#f9f9f9'),
                'chatSize'         => nfw_get_val($options, 'chatSize', 'medium'),
                'inputContainerBg' => nfw_get_val($options, 'inputContainerBg', '#ffffff'),
                'inputBorderColor' => nfw_get_val($options, 'inputBorderColor', '#eeeeee'),
                'labelColor'       => nfw_get_val($options, 'labelColor', '#65676b'),
                'timestampColor'   => nfw_get_val($options, 'timestampColor', '#656565'),
                'buyBtnText'       => nfw_get_val($options, 'buyBtnText', '🛒 Comprar'),
                'buyBtnBg'         => nfw_get_val($options, 'buyBtnBg', '#99c355'),  
                'viewMoreBtnText'  => nfw_get_val($options, 'viewMoreBtnText', 'Ver las {total} opciones'), 
                'viewMoreBtnColor' => nfw_get_val($options, 'viewMoreBtnColor', '#99c355'),
                'refineBtnText'    => nfw_get_val($options, 'refineBtnText', 'Seguir afinando'),
                'viewBtnText'      => nfw_get_val($options, 'viewBtnText', 'Ver resultados'),
                'maxSuggestions'   => nfw_get_val($options, 'maxSuggestions', '10'),
                'optionsBtnBg'     => nfw_get_val($options, 'optionsBtnBg', '#ffffff'),
                'optionsBtnColor'  => nfw_get_val($options, 'optionsBtnColor', '#333333'),
                'optionsBtnBorder' => nfw_get_val($options, 'optionsBtnBorder', '#e5e7eb'),
                'optionsBtnHoverBg'=> nfw_get_val($options, 'optionsBtnHoverBg', '#f3f4f6'),
                'siteURL'          => site_url(),
                'baseUrl'          => nfw_get_val($options, 'baseUrl', site_url()),
                'backendUrl'       => nfw_get_val($options, 'backendUrl', 'http://localhost:4000/api/chat'),
                'backendApiKey'    => nfw_get_val($options, 'backendApiKey', ''),
                'whatsappNumber'   => nfw_get_val($options, 'whatsappNumber', ''),
                'newConvEnabled'   => nfw_get_val($options, 'newConvEnabled', 'true'),
                'newConvText'      => nfw_get_val($options, 'newConvText', 'Nueva conversación'),
                'newConvBg'        => nfw_get_val($options, 'newConvBg', '#ffffff'),
                'newConvColor'     => nfw_get_val($options, 'newConvColor', '#555555'),
                'newConvHoverBg'   => nfw_get_val($options, 'newConvHoverBg', '#f0f0f0'),
                'newConvTooltip'   => nfw_get_val($options, 'newConvTooltip', 'Borrar conversación y empezar de nuevo'),
                'telefono'         => nfw_get_val($options, 'telefono', ''),
                'email'            => nfw_get_val($options, 'email', ''),
                'mapsUrl'          => nfw_get_val($options, 'mapsUrl', ''),
                'sobreNosotrosUrl' => nfw_get_val($options, 'sobreNosotrosUrl', ''),
                'bajasUrl'         => nfw_get_val($options, 'bajasUrl', ''),
                'campaUrl'         => nfw_get_val($options, 'campaUrl', ''),
                'horario'          => nfw_get_val($options, 'horario', ''),
                'restUrl'          => rest_url('neto-bot/v1/track-click'),
                'restNonce'        => wp_create_nonce('wp_rest')
            );

            wp_localize_script('nfw-js', 'ChatBotConfig', $react_config);
        }
    } catch (\Throwable $e) {
        //  Atrapa errores en el frontend
        error_log('Error cargando los scripts del Chatbot: ' . $e->getMessage());
    }
}
add_action('wp_enqueue_scripts', 'nfw_load_files');

//INYECCION DEL ROOT DE REACT  
function nfw_agregar_div() {
     echo '<div id="neto-floating-widget-root"></div>';
} 
add_action('wp_footer', 'nfw_agregar_div');