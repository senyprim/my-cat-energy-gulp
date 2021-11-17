(function(){
    function menu(){
        NO_JS_CLASS='main-nav__no--js';
        MENU_OPEN_CLASS='main-nav--open';
        const mainNav= document.querySelector(".main-nav");
        const button=document.querySelector(".main-nav__toggle");
        mainNav.classList.remove(NO_JS_CLASS);
        if (button){
            button.addEventListener('click',()=>{
                mainNav.classList.toggle(MENU_OPEN_CLASS);
            })
        }
    }
    function slider(){
        const slider=document.querySelector(".image-slider__trackbar");
        const leftImage=document.querySelector(".image-slider__image--before");
        const rightImage=document.querySelector(".image-slider__image--after");
        if (slider){
            slider.addEventListener('change',(evt)=>{

            })
        }
    }


    menu();
}
())