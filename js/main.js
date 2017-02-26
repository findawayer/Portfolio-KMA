/*! 대한민국 기상청(포트폴리오 데모) JavaScript */

( function( window, document, $, undefined ) {

    // 브라우저 감지 (IE 교정 전용)
    var isIE = false || !!document.documentMode;

    // SVG가 지원되지 않는 환경에서는 같은 경로의 .png 파일로 대체
    if ( !Modernizr.svg ) {
        $( "img[src$='.svg']" ).each( function() {
            $( this ).attr( "src", $( this ).attr( "src" ).replace( ".svg", ".png" ) );
        });
    }

    // Datepicker를 이용한 날씨 데이터 로드
    // jQuery datepicker API: http://api.jqueryui.com/1.11/datepicker/

    // datepicker 출력을 현지화
    $.datepicker.setDefaults({
        closeText: "닫기",
        currentText: "오늘",
        nextText: "&rtrif;",
        prevText: "&ltrif;",
        monthNames: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
        monthNamesShort: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
        dayNames: ["일요일","월요일","화요일","수요일","목요일","금요일","토요일"],
        dayNamesShort: ["일","월","화","수","목","금","토"],
        dayNamesMin: ["일","월","화","수","목","금","토"],
        weekHeader: "주",
        dateFormat: "yy년 m월 d일 (D)",
        firstDay: 0,
        showMonthAfterYear: true,
        yearSuffix: "년"
    });

    // 날씨 맵의 날짜 선택칸에 datepicker 적용
    $( "#meteomap_date" )
        .datepicker({
            showOn: "button",
            buttonText: "선택",
            maxDate: "2017년 1월 2일 (월)", // "+10d"
            minDate: "2016년 12월 22일 (목)", // "-1d"
            onSelect: function( str, obj ) {
                // 선택한 날짜에 따라 메테오 맵의 데이터를 업데이트
                var isoDate = [obj.currentYear, obj.currentMonth + 1, obj.currentDay].join("-");

                updateMeteoMap( isoDate );
            }
        })
        // 기본 날짜를 2016년 12월 24일로 고정 (포트폴리오 데모 전용)
        .datepicker(
            "setDate",
            $.datepicker.formatDate(
                $.datepicker._defaults.dateFormat,
                new Date( "December 23, 2016" )
            )
        );

    // 기상청 새 소식에 jQuery tabs 적용
    $( "#board_widget" ).tabs();

    // 언어, 관련기관 바로가기에 jQuery selectmenu 적용
    // jQuery selectmenu API: https://api.jqueryui.com/selectmenu/
    $( "#language, #bookmarks select" ).selectmenu({
        change: function( event, data ) {
            // 항목을 클릭하면 해당 사이트로 이동
            if ( data.item.value ) window.location = data.item.value;
        }
    });

    $( "#b_administrative" ).selectmenu( "menuWidget" ).addClass( "select_overflow" );

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

    /**
     * 메테오 맵에 기상 데이터를 입력
     * 기상 데이터 위치 ../json/meteo_data.json
     * @param {string} dateString - 출력할 데이터의 날짜. ISOdate 형식으로 기입.
     */

    // 메테오 맵을 2016년 12월 23일 기준으로 활성화 (포트폴리오 전용 설정)
    var today = "2016-12-23";
    var todayUnix = new Date( today ).getTime();
    updateMeteoMap( today );

    function updateMeteoMap( dateString ) {
        var container = document.getElementById( "meteomap_list" );
        var items = container.children;
        var dataPath = "json/meteo.json";
        var failedText = "불러오기에 실패했습니다.<br>다시 시도해 주세요.";

        $.ajax({
            url: dataPath,
            dataType: "json",
            success: function( dataset ) {
                applyData( dataset[dateString] );
            },
            error: function() {
                notifyFailure( failedText );
            }
        });

        function applyData( obj ) {
            var target, location;
            var weather, tempAvg, tempMax, tempMin, precip, windDir, windSpeed;
            var dataExists = {
                weather: true,
                temperature: true,
                precipitation: true,
                wind: true
            };
            var radio = {
                weather: document.getElementById( "mode_weather" ),
                precipitation: document.getElementById( "mode_precip" ),
                wind: document.getElementById( "mode_wind" )
            };

            // 주어진 날짜에 맞는 데이터가 있는지 확인
            dataExists.weather = obj.hasOwnProperty( "weather" );
            dataExists.temperature = obj.hasOwnProperty( "temperature" );
            dataExists.precipitation = obj.hasOwnProperty( "precipitation" );
            dataExists.wind = obj.hasOwnProperty( "wind" );

            // 데이터의 유무에 따라 라디오 버튼 활성 또는 비활성화
            toggleRadio( radio.weather, dataExists.weather );
            toggleRadio( radio.precipitation, dataExists.precipitation );
            toggleRadio( radio.wind, dataExists.wind );

            for ( var i = 0, j = items.length; i < j; i++ ) {
                target = items[i].querySelector(".data");
                location = items[i].className;

                emptyElement( target );

                if ( dataExists.weather ) {
                    whether = document.createElement( "i" );
                    whether.className = "meteo " + obj.weather[location] || "null";

                    target.appendChild( whether );
                }

                if ( dataExists.temperature ) {
                    tempAvg = document.createElement( "span" );
                    tempMax = document.createElement( "span" );
                    tempMin = document.createElement( "span" );
                    tempAvg.className = "temp_avg";
                    tempMax.className = "temp_max";
                    tempMin.className = "temp_min";
                    tempAvg.appendChild( document.createTextNode( obj.temperature[location].avg || "" ) );
                    tempMax.appendChild( document.createTextNode( obj.temperature[location].max || "" ) );
                    tempMin.appendChild( document.createTextNode( obj.temperature[location].min || "" ) );

                    target.appendChild( tempAvg );
                    target.appendChild( tempMax );
                    target.appendChild( tempMin );
                }

                if ( dataExists.precipitation ) {
                    precip = document.createElement( "span" );
                    precip.className = "precip";
                    precip.appendChild( document.createTextNode( obj.precipitation[location] || "" ) );

                    target.appendChild( precip );
                }

                if ( dataExists.wind ) {
                    windDir = document.createElement( "i" );
                    windSpeed = document.createElement( "span" );
                    windDir.className = "wind_dir " + obj.wind[location].dir || "null";
                    windSpeed.className = "wind_spd";
                    windSpeed.appendChild( document.createTextNode( obj.wind[location].speed || "" ) );

                    target.appendChild( windDir );
                    target.appendChild( windSpeed );
                }
            }
        }

        function toggleRadio( radio, bln ) {
            if ( bln ) {
                $( radio ).removeClass( "disabled" );
            } else {
                $( radio ).addClass( "disabled" );
            }

            radio.disabled = !bln;
            radio.setAttribute( "aria-disabled", !bln );
        }

        function emptyElement( el ) {
            while ( el.lastChild ) {
                el.removeChild( el.lastChild );
            }
        }

        function notifyFailure( text ) {
            var message = document.createElement( "p" );
            message.appendChild( document.createTextNode( text ) );
            container.appendChild( message );
        }
    }

    /**
     * 전국 날씨 지도의 디스플레이 속성을 토글
     * @param {string} mode - 표시할 데이터의 종류. "weather", "precip", "wind" 중 선택.
     * @param {boolean} isToday - 기본 날짜와 같은지 표시
     */ 

    // 날씨-강수량-바람 스위치 버튼을 활성화
    var $meteomap_toggler = $( "#meteomap_switcher" );
    var meteomap_list = document.getElementById( "meteomap_list" );

    $meteomap_toggler.on( "change", "input", function() {
        toggleMeteoMap( this.id, true );
    });

    function toggleMeteoMap( mode, isToday ) {
        var prevClass = meteomap_list.className.replace(/(mode+\S*)(.*)/g, "$1");
        var newClass = mode + ( isToday ? " currentday" : "" );

        $( "#" + prevClass ).removeClass( "active" ).attr( "aria-checked", "false" );
        $( "#" + mode ).addClass( "active" ).attr( "aria-checked", "true" );
        meteomap_list.className = newClass;
    }

    /**
     * 로그인 폼 placeholder 트릭
     * @param {string} dateString - 출력할 데이터의 날짜. ISOdate 형식으로 기입.
     */
    // 아이디, 비밀번호에 글자를 입력하면 라벨을 숨김
    $( "#user_id, #user_password" ).on( "keydown keyup keypress blur", function() {
        placeholderLabel( $(this) );
    });

    function placeholderLabel( $textField ) {
        $textField.val() === ""
            ? $textField.next( "label" ).show()
            : $textField.next( "label" ).hide();
    }

} )( window, document, jQuery );