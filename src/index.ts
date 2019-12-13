const ANIMATION = 'animation';
const TRANSITION = 'transition';

/**
 * Gets element animation/transition info
 *
 * @param {Element}  element
 */
function getElementInfo(element: Element) {

    const props = [ANIMATION, TRANSITION];
    const styles = window.getComputedStyle(element);
    const getPropertyValue = styles.getPropertyValue.bind(styles);

    const info: any = {
        isWebkit: !!styles['webkit' + ucfirst(ANIMATION)]
    };

    for (let i = 0; i < props.length; i++) {
        const prop = props[i];

        info[prop] = {
            duration: parse(getPropertyValue(prop + '-duration')),
            delay: parse(getPropertyValue(prop + '-delay')),
            timingFunction: getPropertyValue(prop + '-timing-function'),
        }

        if (prop === TRANSITION) {
            info[prop].property = getPropertyValue(prop + '-property');
        }

        if (prop === ANIMATION) {
            info[prop].name = getPropertyValue(prop + '-name');
            info[prop].direction = getPropertyValue(prop + '-direction');
            info[prop].fillMode = getPropertyValue(prop + '-fill-mode');
            info[prop].iterationCount = parseInt(getPropertyValue(prop + '-iteration-count')) || 0;
            info[prop].palyState = getPropertyValue(prop + '-play-state');
        }
    }

    return info;
}

/**
 * Gets corresponding event name if animation or transition enabled
 *
 * @param {HTMLElement} element
 * @param {"animation" | "transition"} prop
 * @param {"start" | "end" | "iteration"} phase
 * @returns {string}
 */
function getEventName(
    element: HTMLElement,
    prop: 'animation'|'transition',
    phase: 'start'|'end'|'iteration'
) {

    const info = getElementInfo(element);
    const eventName = info.isWebkit
        ? 'webkit' + ucfirst(prop) + ucfirst(phase)
        : prop + phase
    ;

    // transition has the 'end' phase only
    if (prop === TRANSITION && phase !== 'end') {
        return;
    }

    return eventName;
}

/**
 * Gets element's longest defined transition or animation timeout (duration + delay)
 *
 * @param   {HTMLElement} element
 * @returns {number}
 */
function getLongestDuration(element: HTMLElement) {
    if (!element) {
        return 0;
    }

    const info = getElementInfo(element);
    const animation = info.animation;
    const transition = info.transition;
    const delay = 'delay';
    const duration = 'duration';

    return Math.max(
        animation[delay] + animation[duration],
        transition[delay] + transition[duration]
    );
}

/**
 * Sets element classes and calls callbacks on transition/animation end
 *
 * @param {HTMLElement} element
 * @param {{[p: string]: Function | null}} classesMap
 * @param {Function} done
 */
function setClasses(element: HTMLElement, classesMap: {[p: string]: TClassCallback}, done?: () => any) {

    let timeoutId: number;
    const classNames: string[] = [];
    const callbacks: TClassCallback[] = [];

    for(let k in classesMap) {
        classNames.push(k);
        callbacks.push(classesMap[k]);
    }

    const setClass = (className?: string, next?: TClassCallback) => {
        if(timeoutId) {
            clearTimeout(timeoutId);
        }
        if(!className) {
            return;
        }

        timeoutId = setTimeout(() => {
            element.classList.remove(...Object.keys(classesMap));
            element.classList.add(className);
            if(next) {
                next();
            }

            if(classNames.length) {
                setClass(classNames.shift(), callbacks.shift());
            } else {
                // final callback
                done && done();
            }
        }, getLongestDuration(element));
    };

    // first run
    setClass(classNames.shift(), callbacks.shift());
}


export { getEventName, getElementInfo, getLongestDuration, setClasses }

/**
 * Uppercases first letter
 *
 * @param   {string} str
 * @returns {string}
 */
function ucfirst(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parses milliseconds from time string
 *
 * @param   {string} time
 * @returns {number}
 */
function parse(time: string) {
    return time ? parseFloat(time) * 1e3 : 0;
}


type TClassCallback = ((() => any)|null);