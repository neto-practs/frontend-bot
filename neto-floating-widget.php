<?php
/**
 * Plugin Name: Floating Widget
 * Description: Agente de búsqueda conversacional configurable desde WordPress.
 * Version: 3.6
 * Author: Saul
 */

if (!defined('ABSPATH')) exit;

// SCRIPTS DE ADMINISTRACIÓN (Lógica del Panel)
function nfw_admin_scripts($hook) {
    if ('toplevel_page_nfw-config' !== $hook) return;

    wp_enqueue_media();

    // Sintaxis Heredoc limpia
    $custom_js = <<<JS
        jQuery(document).ready(function($){
            // BOTÓN SELECCIONAR DE LA BIBLIOTECA
            $(document).on('click', '.nfw-upload-button', function(e) {
                e.preventDefault();
                var button = $(this);
                var id = button.data('id');
                var uploader = wp.media({
                    title: 'Seleccionar o Subir Imagen',
                    button: { text: 'Usar esta imagen' },
                    multiple: false
                }).on('select', function() {
                    var attachment = uploader.state().get('selection').first().toJSON();
                    $('#' + id).val(attachment.url); 
                    $('#preview-' + id).attr('src', attachment.url).show(); 
                }).open();
            });

            // BOTÓN VISUALIZAR (Para URLs manuales)
            $(document).on('click', '.nfw-preview-trigger', function(e) {
                e.preventDefault();
                var id = $(this).data('id');
                var url = $('#' + id).val();
                if(url) {
                    $('#preview-' + id).attr('src', url).one('load', function() {
                        $(this).show();
                    }).one('error', function() {
                        alert('La URL no parece ser una imagen válida.');
                    });
                } else {
                    alert('Por favor, introduce una URL primero.');
                }
            });

            // LÓGICA BOTÓN RESTABLECER IMÁGENES
            $(document).on('click', '#nfw-reset-images-btn', function(e) {
                e.preventDefault();
                if(confirm('¿Estás seguro de que quieres quitar las imágenes y volver al diseño por defecto?')) {
                    $('#launcherIcon, #headerAvatar').val('');
                    $('#preview-launcherIcon, #preview-headerAvatar').hide().attr('src', '');
                    $('#submit').click();
                }
            });
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
        add_settings_section('nfw_section_images', '6. Logos e Imágenes personalizadas', 'nfw_section_images_desc', 'nfw-config');
        add_settings_section('nfw_section_cards', '7. Tarjetas de Productos', null, 'nfw-config');
        add_settings_section('nfw_section_api', '8. Conexión al Servidor Inteligente', null, 'nfw-config');

        nfw_add_field('headerBg', 'Color de la Cabecera (Franja superior del chat)', 'color', 'nfw_section_header', '#99c355');
        nfw_add_field('headerTitleColor', 'Color del título en la cabecera', 'color', 'nfw_section_header', '#ffffff');
        nfw_add_field('headerTitleText', 'Título Principal (Ej: Soporte Recambios Neto)', 'text', 'nfw_section_header', 'Soporte Recambios');
        nfw_add_field('userDisplayName', 'Nombre que se le da al cliente (Ej: Tú, Invitado)', 'text', 'nfw_section_header', 'Tú');

        nfw_add_field('launcherBg', 'Color del botón flotante (El círculo que abre el chat)', 'color', 'nfw_section_launcher', '#99c355');
        
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

        nfw_add_field('launcherIcon', 'Icono del botón flotante', 'image', 'nfw_section_images', '' );
        nfw_add_field('headerAvatar', 'Foto del Bot en la cabecera', 'image',  'nfw_section_images', '');

        nfw_add_field('buyBtnText', 'Texto del botón de compra', 'text', 'nfw_section_cards', '🛒 Comprar');
        nfw_add_field('buyBtnBg', 'Color de fondo del botón de compra', 'color', 'nfw_section_cards', '#99c355');
        nfw_add_field('viewMoreBtnText', 'Texto botón "Ver más" (Usa "{total}" para número)', 'text', 'nfw_section_cards', 'Ver las {total} opciones');
        nfw_add_field('viewMoreBtnColor', 'Color del botón "Ver más"', 'color', 'nfw_section_cards', '#99c355');

        nfw_add_field('refineBtnText', 'Texto botón de opciones: "Seguir afinando"', 'text', 'nfw_section_cards', 'Seguir afinando');
        nfw_add_field('viewBtnText', 'Texto botón de opciones: "Ver resultados"', 'text', 'nfw_section_cards', 'Ver resultados');
        
        nfw_add_field('optionsBtnBg', 'Fondo de las opciones', 'color', 'nfw_section_cards', '#ffffff');
        nfw_add_field('optionsBtnColor', 'Color del texto de opciones', 'color', 'nfw_section_cards', '#333333');
        nfw_add_field('optionsBtnBorder', 'Color del borde de opciones', 'color', 'nfw_section_cards', '#e5e7eb');
        nfw_add_field('optionsBtnHoverBg', 'Fondo de opciones al pasar el ratón', 'color', 'nfw_section_cards', '#f3f4f6');

        nfw_add_field('backendUrl', 'URL del Backend (¡No usar localhost en producción!)', 'text', 'nfw_section_api', 'https://api.midominio.com/api/chat');
        nfw_add_field('backendApiKey', 'Tu Clave de Acceso (API Key)', 'text', 'nfw_section_api', '');

    } catch (\Throwable $e) {
        //Atrapa errores 
        error_log('Error Crítico evitado en Chatbot Neto (Ajustes): ' . $e->getMessage());
    }
}

add_action('admin_init', 'nfw_settings_init');


// FUNCIONES DE RENDERIZADO UI
function nfw_section_images_desc() {
    echo '<p style="margin-bottom:15px;">Si quieres que el chatbot vuelva a tener su aspecto original (sin imágenes personalizadas), pulsa este botón:</p>';
    echo '<button type="button" id="nfw-reset-images-btn" class="button button-secondary" style="color: #d63638; border-color: #d63638;">Restablecer imágenes por defecto</button>';
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
    ?>
    <div class="wrap">
        <h1>Configuración visual del Chatbot</h1>
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
                'launcherBg'       => nfw_get_val($options, 'launcherBg', '#99c355'),
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
                'launcherIcon'     => nfw_get_val($options, 'launcherIcon', ''),
                'headerAvatar'     => nfw_get_val($options, 'headerAvatar', ''),
                'buyBtnText'       => nfw_get_val($options, 'buyBtnText', '🛒 Comprar'),
                'buyBtnBg'         => nfw_get_val($options, 'buyBtnBg', '#99c355'),  
                'viewMoreBtnText'  => nfw_get_val($options, 'viewMoreBtnText', 'Ver las {total} opciones'), 
                'viewMoreBtnColor' => nfw_get_val($options, 'viewMoreBtnColor', '#99c355'),
                'refineBtnText'    => nfw_get_val($options, 'refineBtnText', 'Seguir afinando'),
                'viewBtnText'      => nfw_get_val($options, 'viewBtnText', 'Ver resultados'),
                'optionsBtnBg'     => nfw_get_val($options, 'optionsBtnBg', '#ffffff'),
                'optionsBtnColor'  => nfw_get_val($options, 'optionsBtnColor', '#333333'),
                'optionsBtnBorder' => nfw_get_val($options, 'optionsBtnBorder', '#e5e7eb'),
                'optionsBtnHoverBg'=> nfw_get_val($options, 'optionsBtnHoverBg', '#f3f4f6'),
                'siteURL'          => site_url(),
                'backendUrl'       => nfw_get_val($options, 'backendUrl', 'http://localhost:4000/api/chat'),
                'backendApiKey'    => nfw_get_val($options, 'backendApiKey', '')
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