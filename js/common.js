( function( window, document, $, undefined ) {

    // 브라우저 감지 (IE 교정 전용)
    var isIE = false || !!document.documentMode;

    // SVG가 지원되지 않는 환경에서는 같은 경로의 .png 파일로 대체
    if ( !Modernizr.svg ) {
        $( "img[src$='.svg']" ).each( function() {
            $( this ).attr( "src", $( this ).attr( "src" ).replace( ".svg", ".png" ) );
        });
    }

    // 스크린 확대 및 축소
    (function zoomScreen() {
        var zoom = {
            current: 1,
            interval: 0.1,
            min: 1,
            max: 1.3
        };
        var $root = $( "body" );
        var $zoomIn = $( "#zoom_in" );
        var $zoomOut = $( "#zoom_out" );

        $zoomIn.on( "click", function( event ) {
            event.preventDefault();
            controlZoom( true );
        });
        $zoomOut.on( "click", function( event ) {
            event.preventDefault();
            controlZoom( false );
        });

        function controlZoom( bln ) {
            if ( bln && zoom.current < zoom.max ) {
                zoom.current += zoom.interval;
            } else if ( !bln && zoom.current > zoom.min ) {
                zoom.current -= zoom.interval;
            } else {
                return;
            }

            $root.css({
                "zoom": zoom.current,
                "moz-transform": "scale(" + zoom.current + ")",
                "moz-transform-origin": "50% top"
            });

            if ( isIE ) {
                var offsetX = window.innerWidth * ( 1 - zoom.current ) / 2;
                $root.css( "left", offsetX + "px" );
            }
        }
    })();

} )( window, document, jQuery );