//---------------------------------------------------------------------------

/** SVG attribute name for a JSX prop; undefined for props that are not SVG (event handlers, key, ref, ...) */
export function svgAttrName(prop: string): string | undefined {
    if (REACT_ONLY.has(prop) || /^on[A-Z]/.test(prop)) {
        return undefined;
    }
    if (REACT_TO_SVG[prop]) {
        return REACT_TO_SVG[prop];
    }
    if (CAMEL_ATTRS.has(prop) || prop.includes('-') || prop.includes(':')) {
        return prop;
    }
    return prop.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

/** React-only props that have no SVG meaning */
const REACT_ONLY = new Set(['key', 'ref', 'children', 'dangerouslySetInnerHTML', 'suppressHydrationWarning', 'suppressContentEditableWarning', 'htmlFor']);

//---------------------------------------------------------------------------

/** SVG attributes that are camelCase in SVG itself, so React writes them unchanged */
const CAMEL_ATTRS = new Set([
    'allowReorder', 'attributeName', 'attributeType', 'autoReverse', 'baseFrequency', 'baseProfile', 'calcMode', 'clipPathUnits',
    'contentScriptType', 'contentStyleType', 'diffuseConstant', 'edgeMode', 'externalResourcesRequired', 'filterRes', 'filterUnits',
    'glyphRef', 'gradientTransform', 'gradientUnits', 'kernelMatrix', 'kernelUnitLength', 'keyPoints', 'keySplines', 'keyTimes',
    'lengthAdjust', 'limitingConeAngle', 'markerHeight', 'markerUnits', 'markerWidth', 'maskContentUnits', 'maskUnits', 'numOctaves',
    'pathLength', 'patternContentUnits', 'patternTransform', 'patternUnits', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'preserveAlpha',
    'preserveAspectRatio', 'primitiveUnits', 'refX', 'refY', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures',
    'specularConstant', 'specularExponent', 'spreadMethod', 'startOffset', 'stdDeviation', 'stitchTiles', 'surfaceScale',
    'systemLanguage', 'tableValues', 'targetX', 'targetY', 'textLength', 'viewBox', 'viewTarget', 'xChannelSelector',
    'yChannelSelector', 'zoomAndPan',
]);

/** React prop names that do not follow the camelCase rule */
const REACT_TO_SVG: Record<string, string> = {
    className: 'class',
    xlinkActuate: 'xlink:actuate',
    xlinkArcrole: 'xlink:arcrole',
    xlinkHref: 'xlink:href',
    xlinkRole: 'xlink:role',
    xlinkShow: 'xlink:show',
    xlinkTitle: 'xlink:title',
    xlinkType: 'xlink:type',
    xmlBase: 'xml:base',
    xmlLang: 'xml:lang',
    xmlSpace: 'xml:space',
    xmlnsXlink: 'xmlns:xlink',
    tabIndex: 'tabindex',
};

//---------------------------------------------------------------------------

/** JSX prop name for an SVG attribute; undefined for namespace declarations and editor-specific attributes (inkscape:*, sodipodi:*, ...) */
export function reactPropName(attr: string): string | undefined {
    if (SVG_TO_REACT[attr]) {
        return SVG_TO_REACT[attr];
    }
    if (attr === 'xmlns' || attr.includes(':')) {
        return undefined;
    }
    if (CAMEL_ATTRS.has(attr) || attr.startsWith('data-') || attr.startsWith('aria-')) {
        return attr;
    }
    return attr.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

const SVG_TO_REACT: Record<string, string> = Object.fromEntries(Object.entries(REACT_TO_SVG).map(([react, svg]) => [svg, react]));

//---------------------------------------------------------------------------

/**
 * SVG element name for a JSX tag: SVG names as they are, and react-native-svg components (`Svg`, `Path`, `LinearGradient`, `TSpan`)
 * by their SVG names. Undefined for other components, whose children are kept without the tag.
 */
export function svgElementName(tag: string): string | undefined {
    return knownSvgElementName(tag) ?? (/^[a-z][\w-]*$/.test(tag) ? tag : undefined); // other lowercase tags are left for the SVG parser to judge
}

/** Like svgElementName, but only for elements in SVG_ELEMENTS */
export function knownSvgElementName(tag: string): string | undefined {
    if (SVG_ELEMENTS.has(tag)) {
        return tag;
    }
    if (tag === 'TSpan') {
        return 'tspan';
    }
    const lower = tag[0].toLowerCase() + tag.slice(1);
    return SVG_ELEMENTS.has(lower) ? lower : undefined;
}

export const SVG_ELEMENTS = new Set([
    'svg', 'g', 'defs', 'symbol', 'use', 'switch', 'a', 'title', 'desc', 'metadata', 'style', 'script',
    'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'textPath', 'image', 'foreignObject',
    'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'marker', 'filter', 'view',
    'animate', 'animateMotion', 'animateTransform', 'set', 'mpath',
    'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
    'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge',
    'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
]);

//---------------------------------------------------------------------------
