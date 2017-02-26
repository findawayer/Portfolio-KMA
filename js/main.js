/*!
 * 대한민국 기상청(포트폴리오 데모) JavaScript
 * @Author: TSL
 * @License: Custom License
 */

( function( window, document, $, undefined ) {

    // 브라우저 감지 (IE 교정 전용)
    var isIE = false || !!document.documentMode;

    // SVG가 지원되지 않는 환경에서는 같은 경로의 .png 파일로 대체
    if ( !Modernizr.svg ) {
        $( "img[src$='.svg']" ).each( function() {
            $( this ).attr( "src", $( this ).attr( "src" ).replace( ".svg", ".png" ) );
        });
    }

    // 메테오 맵을 2016년 12월 23일 기준으로 활성화 (포트폴리오 전용 설정)
    var today = "2016-12-23";
    var todayUnix = new Date( today ).getTime();
    updateMeteoMap( today );

    // 날씨-강수량-바람 스위치 버튼을 활성화
    var $meteomap_toggler = $( "#meteomap_switcher" );
    var meteomap_list = document.getElementById( "meteomap_list" );

    $meteomap_toggler.on( "change", "input", function() {
        toggleMeteoMap( this.id, true );
    });

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

    // 타겟 요소에 datepicker 적용
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

                // 기본 날짜보다 미래의 날짜를 선택할 경우
                var isFuture = new Date( isoDate ).getTime() > todayUnix;

                $( "#mode_precip, #mode_wind" )
                    .prop( "disabled", isFuture ) // 강수량과 풍향풍속 모드를 비활성화
                    .addClass( "disabled" ); // 스타일링용 클래스 부여
                
                if ( isFuture ) {
                    $( "#mode_weather" ).trigger( "click" ); // 날씨 모드로 강제 전환
                }
                else {
                    $( "#mode_precip, #mode_wind" ).removeClass( "disabled" ); // 스타일링 초기화
               }
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
    $( "#language, #bookmarks select" )
        .selectmenu({
            change: function( event, data ) {
                // 항목을 클릭하면 해당 사이트로 이동
                if ( data.item.value !== "" )
                    window.location = data.item.value;
            }

        });

    $( "#b_administrative" ).selectmenu( "menuWidget" ).addClass( "select_overflow" );

    // 아이디, 비밀번호에 글자를 입력하면 라벨을 숨김
    $( "#user_id, #user_password" ).on( "keydown keyup keypress blur", function() {
        placeholderLabel( $(this) );
    });

    /**
     * 스크린 확대 및 축소
     */
    var zoomScreen = function() {
        this.current = 1;
        this.interval = 0.1;
        this.min = 1;
        this.max = 1.3;
        this.root = document.body;
        this.zoomInButton = document.getElementById( "zoom_in" );
        this.zoomOutButton = document.getElementById( "zoom_out" );

        var _ = this;

        this.zoomInButton.onclick = function() {
            _.zoom( true );
        };
        this.zoomOutButton.onclick = function() {
            _.zoom( false );
        };
    };

    zoomScreen.prototype.zoom = function( boolean ) {
        if ( boolean && this.current < this.max ) {
            this.current += this.interval;
        }
        else if ( !boolean && this.current > this.min ) {
            this.current -= this.interval;
        }
        else {
            return;
        }

        this.root.style.zoom = this.current;
        this.root.style.MozTransform = "scale(" + this.current + ")";
        this.root.style.MozTransformOrigin = "50% top";

        if ( isIE ) {
            console.log(true);
            var offsetX = window.innerWidth * ( 1 - this.current ) / 2;
            this.root.style.left = offsetX + "px";
        }
    };

    new zoomScreen();

    /**
     * 메테오 맵에 기상 데이터를 입력
     * 기상 데이터 위치 ../json/meteo_data.json
     * @param {string} dateString - 출력할 데이터의 날짜. ISOdate 형식으로 기입.
     */
    function updateMeteoMap( dateString ) {
        var dataObj = data[dateString];

        if ( !dataObj ) {
            throw new Error( "선택한 날짜의 기상정보가 존재하지 않습니다." );
            return;
        }

        var items = document.getElementById( "meteomap_list" ).children;

        for ( var i = 0, j = items.length; i < j; i++ ) {
            var ret = '';
            var location = items[i].className;

            if ( dataObj.hasOwnProperty( "weather" ) ) {
                ret += '<i class="meteo ' + ( dataObj.weather[location] || 'null' ) + '"></i>';
            }
            if ( dataObj.hasOwnProperty( "temperature" ) ) {
                ret += '<span class="temp_avg">' + ( dataObj.temperature[location].avg || '' ) + '</span>'
                     + '<span class="temp_max">' + ( dataObj.temperature[location].max || '' ) + '</span>'
                     + '<span class="temp_min">' + ( dataObj.temperature[location].min || '' ) + '</span>';
            }
            if ( dataObj.hasOwnProperty( "precipitation" ) ) {
                ret += '<span class="precip">' + ( dataObj.precipitation[location] || '' ) + '</span>';
            }
            if ( dataObj.hasOwnProperty( "wind" ) ) {
                ret += '<i class="wind_dir ' + ( dataObj.wind[location].dir || 'null' ) + '"></i>'
                     + '<span class="wind_spd">' + ( dataObj.wind[location].speed || '' ) + '</span>';
            }

            // li > a > span.data 위치에 HTML을 삽입
            items[i].children[0].children[1].innerHTML = ret;
        }
    }

    /**
     * 전국 날씨 지도의 디스플레이 속성을 토글
     * @param {string} mode - 표시할 데이터의 종류. "weather", "precip", "wind" 중 선택.
     * @param {boolean} isToday - 기본 날짜와 같은지 표시
     */ 
    function toggleMeteoMap( mode, isToday ) {
        var prevClass = meteomap_list.className.replace(/(mode+\S*)(.*)/g, "$1");
        var newClass = mode + ( isToday ? " currentday" : "" );

        $( document.getElementById( prevClass ) ).removeClass( "active" ).attr( "aria-checked", "false" );
        $( document.getElementById( mode ) ).addClass( "active" ).attr( "aria-checked", "true" );
        meteomap_list.className = newClass;
    }

    /**
     * 로그인 폼 placeholder 트릭
     * @param {string} dateString - 출력할 데이터의 날짜. ISOdate 형식으로 기입.
     */
    function placeholderLabel( $textField ) {
        $textField.val() === ""
            ? $textField.next( "label" ).show()
            : $textField.next( "label" ).hide();
    }

} )( window, document, jQuery );