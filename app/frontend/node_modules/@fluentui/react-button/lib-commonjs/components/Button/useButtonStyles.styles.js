'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    buttonClassNames: function() {
        return buttonClassNames;
    },
    useButtonStyles_unstable: function() {
        return useButtonStyles_unstable;
    }
});
const _reacttheme = require("@fluentui/react-theme");
const _react = require("@griffel/react");
const buttonClassNames = {
    root: 'fui-Button',
    icon: 'fui-Button__icon'
};
const iconSpacingVar = '--fui-Button__icon--spacing';
const buttonSpacingSmall = '3px';
const buttonSpacingSmallWithIcon = '1px';
const buttonSpacingMedium = '5px';
const buttonSpacingLarge = '8px';
const buttonSpacingLargeWithIcon = '7px';
/* Firefox has box shadow sizing issue at some zoom levels
 * this will ensure the inset boxShadow is always uniform
 * without affecting other browser platforms
 */ const boxShadowStrokeWidthThinMoz = `calc(${_reacttheme.tokens.strokeWidthThin} + 0.25px)`;
const useRootBaseClassName = /*#__PURE__*/ (0, _react.__resetStyles)("r1alrhcs", null, {
    r: [
        ".r1alrhcs{align-items:center;box-sizing:border-box;display:inline-flex;justify-content:center;text-decoration-line:none;vertical-align:middle;margin:0;overflow:hidden;background-color:var(--colorNeutralBackground1);color:var(--colorNeutralForeground1);border:var(--strokeWidthThin) solid var(--colorNeutralStroke1);font-family:var(--fontFamilyBase);outline-style:none;padding:5px var(--spacingHorizontalM);min-width:96px;border-radius:var(--borderRadiusMedium);font-size:var(--fontSizeBase300);font-weight:var(--fontWeightSemibold);line-height:var(--lineHeightBase300);transition-duration:var(--durationFaster);transition-property:background,border,color;transition-timing-function:var(--curveEasyEase);}",
        ".r1alrhcs:hover{background-color:var(--colorNeutralBackground1Hover);border-color:var(--colorNeutralStroke1Hover);color:var(--colorNeutralForeground1Hover);cursor:pointer;}",
        ".r1alrhcs:hover:active{background-color:var(--colorNeutralBackground1Pressed);border-color:var(--colorNeutralStroke1Pressed);color:var(--colorNeutralForeground1Pressed);outline-style:none;}",
        ".r1alrhcs[data-fui-focus-visible]{border-color:var(--colorStrokeFocus2);border-radius:var(--borderRadiusMedium);border-width:1px;outline:var(--strokeWidthThick) solid var(--colorTransparentStroke);box-shadow:0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset;z-index:1;}"
    ],
    s: [
        "@media screen and (prefers-reduced-motion: reduce){.r1alrhcs{transition-duration:0.01ms;}}",
        "@media (forced-colors: active){.r1alrhcs:focus{border-color:ButtonText;}.r1alrhcs:hover{background-color:HighlightText;border-color:Highlight;color:Highlight;forced-color-adjust:none;}.r1alrhcs:hover:active{background-color:HighlightText;border-color:Highlight;color:Highlight;forced-color-adjust:none;}}",
        "@supports (-moz-appearance:button){.r1alrhcs[data-fui-focus-visible]{box-shadow:0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset;}}"
    ]
});
const useIconBaseClassName = /*#__PURE__*/ (0, _react.__resetStyles)("rywnvv2", null, [
    ".rywnvv2{align-items:center;display:inline-flex;justify-content:center;font-size:20px;height:20px;width:20px;--fui-Button__icon--spacing:var(--spacingHorizontalSNudge);}"
]);
const useRootStyles = /*#__PURE__*/ (0, _react.__styles)({
    outline: {
        De3pzq: "f1c21dwh",
        Jwef8y: "fjxutwb",
        iro3zm: "fwiml72"
    },
    primary: {
        De3pzq: "ffp7eso",
        g2u3we: "f1p3nwhy",
        h3c5rm: [
            "f11589ue",
            "f1pdflbu"
        ],
        B9xav0g: "f1q5o8ev",
        zhjwy3: [
            "f1pdflbu",
            "f11589ue"
        ],
        sj55zd: "f1phragk",
        Jwef8y: "f15wkkf3",
        Bgoe8wy: "f1s2uweq",
        Bwzppfd: [
            "fr80ssc",
            "fecsdlb"
        ],
        oetu4i: "f1ukrpxl",
        gg5e9n: [
            "fecsdlb",
            "fr80ssc"
        ],
        Bi91k9c: "f1rq72xc",
        iro3zm: "fnp9lpt",
        b661bw: "f1h0usnq",
        Bk6r4ia: [
            "fs4ktlq",
            "fx2bmrt"
        ],
        B9zn80p: "f16h9ulv",
        Bpld233: [
            "fx2bmrt",
            "fs4ktlq"
        ],
        B2d53fq: "f1d6v5y2",
        By8wz76: "f1nz3ub2",
        Bcq6wej: "fag2qd2",
        Jcjdmf: [
            "fmvhcg7",
            "f14bpyus"
        ],
        sc4o1m: "f1o3dhpw",
        Bosien3: [
            "f14bpyus",
            "fmvhcg7"
        ],
        B7iucu3: "fqc85l4",
        B8gzw0y: "f1h3a8gf",
        Bbkh6qg: "fkiggi6",
        F230oe: "f8gmj8i",
        Bdw8ktp: [
            "f1ap8nzx",
            "fjag8bx"
        ],
        Bj1xduy: "f1igan7k",
        Bhh2cfd: [
            "fjag8bx",
            "f1ap8nzx"
        ],
        Bahaeuw: "f1v3eptx",
        rxnm8d: "fpelvsg",
        Bso50sa: "f1r9enuy",
        B65bq0w: [
            "fdvt4n0",
            "f1grx941"
        ],
        Buont6p: "f1l34yyb",
        B0o9ejx: [
            "f1grx941",
            "fdvt4n0"
        ],
        Dcq74g: "fqfbdvs"
    },
    secondary: {},
    subtle: {
        De3pzq: "fhovq9v",
        g2u3we: "f1p3nwhy",
        h3c5rm: [
            "f11589ue",
            "f1pdflbu"
        ],
        B9xav0g: "f1q5o8ev",
        zhjwy3: [
            "f1pdflbu",
            "f11589ue"
        ],
        sj55zd: "fkfq4zb",
        Jwef8y: "f1t94bn6",
        Bgoe8wy: "f1s2uweq",
        Bwzppfd: [
            "fr80ssc",
            "fecsdlb"
        ],
        oetu4i: "f1ukrpxl",
        gg5e9n: [
            "fecsdlb",
            "fr80ssc"
        ],
        Bi91k9c: "fnwyq0v",
        Bk3fhr4: "ft1hn21",
        Bmfj8id: "fuxngvv",
        Bbdnnc7: "fy5bs14",
        iro3zm: "fsv2rcd",
        b661bw: "f1h0usnq",
        Bk6r4ia: [
            "fs4ktlq",
            "fx2bmrt"
        ],
        B9zn80p: "f16h9ulv",
        Bpld233: [
            "fx2bmrt",
            "fs4ktlq"
        ],
        B2d53fq: "f1omzyqd",
        em6i61: "f1dfjoow",
        vm6p8p: "f1j98vj9",
        x3br3k: "fj8yq94",
        Bahaeuw: "f1v3eptx",
        Buhizc3: "fivsta0",
        Dcq74g: "fqfbdvs",
        zyxd5v: "f1wfsnb3"
    },
    transparent: {
        De3pzq: "f1c21dwh",
        g2u3we: "f1p3nwhy",
        h3c5rm: [
            "f11589ue",
            "f1pdflbu"
        ],
        B9xav0g: "f1q5o8ev",
        zhjwy3: [
            "f1pdflbu",
            "f11589ue"
        ],
        sj55zd: "fkfq4zb",
        Jwef8y: "fjxutwb",
        Bgoe8wy: "f1s2uweq",
        Bwzppfd: [
            "fr80ssc",
            "fecsdlb"
        ],
        oetu4i: "f1ukrpxl",
        gg5e9n: [
            "fecsdlb",
            "fr80ssc"
        ],
        Bi91k9c: "f139oj5f",
        Bk3fhr4: "ft1hn21",
        Bmfj8id: "fuxngvv",
        iro3zm: "fwiml72",
        b661bw: "f1h0usnq",
        Bk6r4ia: [
            "fs4ktlq",
            "fx2bmrt"
        ],
        B9zn80p: "f16h9ulv",
        Bpld233: [
            "fx2bmrt",
            "fs4ktlq"
        ],
        B2d53fq: "f1fg1p5m",
        em6i61: "f1dfjoow",
        vm6p8p: "f1j98vj9",
        Bbkh6qg: "fxoo9op",
        Bahaeuw: "f1v3eptx",
        rxnm8d: "f11slz88",
        Dcq74g: "fqfbdvs"
    },
    circular: {
        Beyfa6y: 0,
        Bbmb7ep: 0,
        Btl43ni: 0,
        B7oj6ja: 0,
        Dimara: "f44lkw9"
    },
    rounded: {},
    square: {
        Beyfa6y: 0,
        Bbmb7ep: 0,
        Btl43ni: 0,
        B7oj6ja: 0,
        Dimara: "f1fabniw"
    },
    small: {
        Bf4jedk: "fh7ncta",
        Byoj8tv: 0,
        uwmqm3: 0,
        z189sj: 0,
        z8tnut: 0,
        B0ocmuz: "fneth5b",
        Beyfa6y: 0,
        Bbmb7ep: 0,
        Btl43ni: 0,
        B7oj6ja: 0,
        Dimara: "ft85np5",
        Be2twd7: "fy9rknc",
        Bhrd7zp: "figsok6",
        Bg96gwp: "fwrc4pm"
    },
    smallWithIcon: {
        Byoj8tv: "f1brlhvm",
        z8tnut: "f1sl3k7w"
    },
    medium: {},
    large: {
        Bf4jedk: "f14es27b",
        Byoj8tv: 0,
        uwmqm3: 0,
        z189sj: 0,
        z8tnut: 0,
        B0ocmuz: "f4db1ww",
        Beyfa6y: 0,
        Bbmb7ep: 0,
        Btl43ni: 0,
        B7oj6ja: 0,
        Dimara: "ft85np5",
        Be2twd7: "fod5ikn",
        Bhrd7zp: "fl43uef",
        Bg96gwp: "faaz57k"
    },
    largeWithIcon: {
        Byoj8tv: "fy7v416",
        z8tnut: "f1a1bwwz"
    }
}, {
    d: [
        ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
        ".ffp7eso{background-color:var(--colorBrandBackground);}",
        ".f1p3nwhy{border-top-color:transparent;}",
        ".f11589ue{border-right-color:transparent;}",
        ".f1pdflbu{border-left-color:transparent;}",
        ".f1q5o8ev{border-bottom-color:transparent;}",
        ".f1phragk{color:var(--colorNeutralForegroundOnBrand);}",
        ".fhovq9v{background-color:var(--colorSubtleBackground);}",
        ".fkfq4zb{color:var(--colorNeutralForeground2);}",
        [
            ".f44lkw9{border-radius:var(--borderRadiusCircular);}",
            {
                p: -1
            }
        ],
        [
            ".f1fabniw{border-radius:var(--borderRadiusNone);}",
            {
                p: -1
            }
        ],
        ".fh7ncta{min-width:64px;}",
        [
            ".fneth5b{padding:3px var(--spacingHorizontalS);}",
            {
                p: -1
            }
        ],
        [
            ".ft85np5{border-radius:var(--borderRadiusMedium);}",
            {
                p: -1
            }
        ],
        ".fy9rknc{font-size:var(--fontSizeBase200);}",
        ".figsok6{font-weight:var(--fontWeightRegular);}",
        ".fwrc4pm{line-height:var(--lineHeightBase200);}",
        ".f1brlhvm{padding-bottom:1px;}",
        ".f1sl3k7w{padding-top:1px;}",
        ".f14es27b{min-width:96px;}",
        [
            ".f4db1ww{padding:8px var(--spacingHorizontalL);}",
            {
                p: -1
            }
        ],
        [
            ".ft85np5{border-radius:var(--borderRadiusMedium);}",
            {
                p: -1
            }
        ],
        ".fod5ikn{font-size:var(--fontSizeBase400);}",
        ".fl43uef{font-weight:var(--fontWeightSemibold);}",
        ".faaz57k{line-height:var(--lineHeightBase400);}",
        ".fy7v416{padding-bottom:7px;}",
        ".f1a1bwwz{padding-top:7px;}"
    ],
    h: [
        ".fjxutwb:hover{background-color:var(--colorTransparentBackgroundHover);}",
        ".fwiml72:hover:active{background-color:var(--colorTransparentBackgroundPressed);}",
        ".f15wkkf3:hover{background-color:var(--colorBrandBackgroundHover);}",
        ".f1s2uweq:hover{border-top-color:transparent;}",
        ".fr80ssc:hover{border-right-color:transparent;}",
        ".fecsdlb:hover{border-left-color:transparent;}",
        ".f1ukrpxl:hover{border-bottom-color:transparent;}",
        ".f1rq72xc:hover{color:var(--colorNeutralForegroundOnBrand);}",
        ".fnp9lpt:hover:active{background-color:var(--colorBrandBackgroundPressed);}",
        ".f1h0usnq:hover:active{border-top-color:transparent;}",
        ".fs4ktlq:hover:active{border-right-color:transparent;}",
        ".fx2bmrt:hover:active{border-left-color:transparent;}",
        ".f16h9ulv:hover:active{border-bottom-color:transparent;}",
        ".f1d6v5y2:hover:active{color:var(--colorNeutralForegroundOnBrand);}",
        ".f1t94bn6:hover{background-color:var(--colorSubtleBackgroundHover);}",
        ".fnwyq0v:hover{color:var(--colorNeutralForeground2Hover);}",
        ".ft1hn21:hover .fui-Icon-filled{display:inline;}",
        ".fuxngvv:hover .fui-Icon-regular{display:none;}",
        ".fy5bs14:hover .fui-Button__icon{color:var(--colorNeutralForeground2BrandHover);}",
        ".fsv2rcd:hover:active{background-color:var(--colorSubtleBackgroundPressed);}",
        ".f1omzyqd:hover:active{color:var(--colorNeutralForeground2Pressed);}",
        ".f1dfjoow:hover:active .fui-Icon-filled{display:inline;}",
        ".f1j98vj9:hover:active .fui-Icon-regular{display:none;}",
        ".fj8yq94:hover:active .fui-Button__icon{color:var(--colorNeutralForeground2BrandPressed);}",
        ".f139oj5f:hover{color:var(--colorNeutralForeground2BrandHover);}",
        ".f1fg1p5m:hover:active{color:var(--colorNeutralForeground2BrandPressed);}"
    ],
    m: [
        [
            "@media (forced-colors: active){.f1nz3ub2{background-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fag2qd2{border-top-color:HighlightText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f14bpyus{border-left-color:HighlightText;}.fmvhcg7{border-right-color:HighlightText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1o3dhpw{border-bottom-color:HighlightText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fqc85l4{color:HighlightText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1h3a8gf{forced-color-adjust:none;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fkiggi6:hover{background-color:HighlightText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f8gmj8i:hover{border-top-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1ap8nzx:hover{border-right-color:Highlight;}.fjag8bx:hover{border-left-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1igan7k:hover{border-bottom-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1v3eptx:hover{color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fpelvsg:hover:active{background-color:HighlightText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1r9enuy:hover:active{border-top-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1grx941:hover:active{border-left-color:Highlight;}.fdvt4n0:hover:active{border-right-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1l34yyb:hover:active{border-bottom-color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fqfbdvs:hover:active{color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fivsta0:hover .fui-Button__icon{color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1wfsnb3:hover:active .fui-Button__icon{color:Highlight;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fxoo9op:hover{background-color:var(--colorTransparentBackground);}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f11slz88:hover:active{background-color:var(--colorTransparentBackground);}}",
            {
                m: "(forced-colors: active)"
            }
        ]
    ]
});
const useRootDisabledStyles = /*#__PURE__*/ (0, _react.__styles)({
    base: {
        De3pzq: "f1bg9a2p",
        g2u3we: "f1jj8ep1",
        h3c5rm: [
            "f15xbau",
            "fy0fskl"
        ],
        B9xav0g: "f4ikngz",
        zhjwy3: [
            "fy0fskl",
            "f15xbau"
        ],
        sj55zd: "f1s2aq7o",
        Bceei9c: "fdrzuqr",
        Bfinmwp: "f15x8b5r",
        Jwef8y: "f1falr9n",
        Bgoe8wy: "f12mpcsy",
        Bwzppfd: [
            "f1gwvigk",
            "f18rmfxp"
        ],
        oetu4i: "f1jnshp0",
        gg5e9n: [
            "f18rmfxp",
            "f1gwvigk"
        ],
        Bi91k9c: "fvgxktp",
        eoavqd: "fphbwmw",
        Bk3fhr4: "f19vpps7",
        Bmfj8id: "fv5swzo",
        Bbdnnc7: "f1al02dq",
        iro3zm: "f1t6o4dc",
        b661bw: "f10ztigi",
        Bk6r4ia: [
            "f1ft5sdu",
            "f1gzf82w"
        ],
        B9zn80p: "f12zbtn2",
        Bpld233: [
            "f1gzf82w",
            "f1ft5sdu"
        ],
        B2d53fq: "fcvwxyo",
        c3iz72: "f8w4c43",
        em6i61: "f1ol4fw6",
        vm6p8p: "f1q1lw4e",
        x3br3k: "f1dwjv2g"
    },
    highContrast: {
        By8wz76: "f14ptb23",
        Bcq6wej: "f9dbb4x",
        Jcjdmf: [
            "f3qs60o",
            "f5u9ap2"
        ],
        sc4o1m: "fwd1oij",
        Bosien3: [
            "f5u9ap2",
            "f3qs60o"
        ],
        B7iucu3: "f1cyfu5x",
        Grqk0h: "f127ot8j",
        h3ptyc: "f19etb0b",
        Buw724y: [
            "f4f984j",
            "fw441p0"
        ],
        Buk7464: "f3d22hf",
        Hwei09: [
            "fw441p0",
            "f4f984j"
        ],
        Bbkh6qg: "fj8k9ua",
        F230oe: "fifrq0d",
        Bdw8ktp: [
            "f196mwp7",
            "fnekfq"
        ],
        Bj1xduy: "f1l6uprw",
        Bhh2cfd: [
            "fnekfq",
            "f196mwp7"
        ],
        Bahaeuw: "fa9u7a5",
        Buhizc3: "f1m71e0y",
        rxnm8d: "f1xxg0vq",
        Bso50sa: "f16oldlo",
        B65bq0w: [
            "f17g64ui",
            "fqbrke7"
        ],
        Buont6p: "fjvf891",
        B0o9ejx: [
            "fqbrke7",
            "f17g64ui"
        ],
        Dcq74g: "f1efp33f",
        zyxd5v: "f1gue8i"
    },
    outline: {
        De3pzq: "f1c21dwh",
        Jwef8y: "f9ql6rf",
        iro3zm: "f3h1zc4"
    },
    primary: {
        g2u3we: "f1p3nwhy",
        h3c5rm: [
            "f11589ue",
            "f1pdflbu"
        ],
        B9xav0g: "f1q5o8ev",
        zhjwy3: [
            "f1pdflbu",
            "f11589ue"
        ],
        Bgoe8wy: "f1s2uweq",
        Bwzppfd: [
            "fr80ssc",
            "fecsdlb"
        ],
        oetu4i: "f1ukrpxl",
        gg5e9n: [
            "fecsdlb",
            "fr80ssc"
        ],
        b661bw: "f1h0usnq",
        Bk6r4ia: [
            "fs4ktlq",
            "fx2bmrt"
        ],
        B9zn80p: "f16h9ulv",
        Bpld233: [
            "fx2bmrt",
            "fs4ktlq"
        ]
    },
    secondary: {},
    subtle: {
        De3pzq: "f1c21dwh",
        g2u3we: "f1p3nwhy",
        h3c5rm: [
            "f11589ue",
            "f1pdflbu"
        ],
        B9xav0g: "f1q5o8ev",
        zhjwy3: [
            "f1pdflbu",
            "f11589ue"
        ],
        Jwef8y: "f9ql6rf",
        Bgoe8wy: "f1s2uweq",
        Bwzppfd: [
            "fr80ssc",
            "fecsdlb"
        ],
        oetu4i: "f1ukrpxl",
        gg5e9n: [
            "fecsdlb",
            "fr80ssc"
        ],
        iro3zm: "f3h1zc4",
        b661bw: "f1h0usnq",
        Bk6r4ia: [
            "fs4ktlq",
            "fx2bmrt"
        ],
        B9zn80p: "f16h9ulv",
        Bpld233: [
            "fx2bmrt",
            "fs4ktlq"
        ]
    },
    transparent: {
        De3pzq: "f1c21dwh",
        g2u3we: "f1p3nwhy",
        h3c5rm: [
            "f11589ue",
            "f1pdflbu"
        ],
        B9xav0g: "f1q5o8ev",
        zhjwy3: [
            "f1pdflbu",
            "f11589ue"
        ],
        Jwef8y: "f9ql6rf",
        Bgoe8wy: "f1s2uweq",
        Bwzppfd: [
            "fr80ssc",
            "fecsdlb"
        ],
        oetu4i: "f1ukrpxl",
        gg5e9n: [
            "fecsdlb",
            "fr80ssc"
        ],
        iro3zm: "f3h1zc4",
        b661bw: "f1h0usnq",
        Bk6r4ia: [
            "fs4ktlq",
            "fx2bmrt"
        ],
        B9zn80p: "f16h9ulv",
        Bpld233: [
            "fx2bmrt",
            "fs4ktlq"
        ]
    }
}, {
    d: [
        ".f1bg9a2p{background-color:var(--colorNeutralBackgroundDisabled);}",
        ".f1jj8ep1{border-top-color:var(--colorNeutralStrokeDisabled);}",
        ".f15xbau{border-right-color:var(--colorNeutralStrokeDisabled);}",
        ".fy0fskl{border-left-color:var(--colorNeutralStrokeDisabled);}",
        ".f4ikngz{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
        ".f1s2aq7o{color:var(--colorNeutralForegroundDisabled);}",
        ".fdrzuqr{cursor:not-allowed;}",
        ".f15x8b5r .fui-Button__icon{color:var(--colorNeutralForegroundDisabled);}",
        ".f1c21dwh{background-color:var(--colorTransparentBackground);}",
        ".f1p3nwhy{border-top-color:transparent;}",
        ".f11589ue{border-right-color:transparent;}",
        ".f1pdflbu{border-left-color:transparent;}",
        ".f1q5o8ev{border-bottom-color:transparent;}"
    ],
    h: [
        ".f1falr9n:hover{background-color:var(--colorNeutralBackgroundDisabled);}",
        ".f12mpcsy:hover{border-top-color:var(--colorNeutralStrokeDisabled);}",
        ".f1gwvigk:hover{border-right-color:var(--colorNeutralStrokeDisabled);}",
        ".f18rmfxp:hover{border-left-color:var(--colorNeutralStrokeDisabled);}",
        ".f1jnshp0:hover{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
        ".fvgxktp:hover{color:var(--colorNeutralForegroundDisabled);}",
        ".fphbwmw:hover{cursor:not-allowed;}",
        ".f19vpps7:hover .fui-Icon-filled{display:none;}",
        ".fv5swzo:hover .fui-Icon-regular{display:inline;}",
        ".f1al02dq:hover .fui-Button__icon{color:var(--colorNeutralForegroundDisabled);}",
        ".f1t6o4dc:hover:active{background-color:var(--colorNeutralBackgroundDisabled);}",
        ".f10ztigi:hover:active{border-top-color:var(--colorNeutralStrokeDisabled);}",
        ".f1ft5sdu:hover:active{border-right-color:var(--colorNeutralStrokeDisabled);}",
        ".f1gzf82w:hover:active{border-left-color:var(--colorNeutralStrokeDisabled);}",
        ".f12zbtn2:hover:active{border-bottom-color:var(--colorNeutralStrokeDisabled);}",
        ".fcvwxyo:hover:active{color:var(--colorNeutralForegroundDisabled);}",
        ".f8w4c43:hover:active{cursor:not-allowed;}",
        ".f1ol4fw6:hover:active .fui-Icon-filled{display:none;}",
        ".f1q1lw4e:hover:active .fui-Icon-regular{display:inline;}",
        ".f1dwjv2g:hover:active .fui-Button__icon{color:var(--colorNeutralForegroundDisabled);}",
        ".f9ql6rf:hover{background-color:var(--colorTransparentBackground);}",
        ".f3h1zc4:hover:active{background-color:var(--colorTransparentBackground);}",
        ".f1s2uweq:hover{border-top-color:transparent;}",
        ".fr80ssc:hover{border-right-color:transparent;}",
        ".fecsdlb:hover{border-left-color:transparent;}",
        ".f1ukrpxl:hover{border-bottom-color:transparent;}",
        ".f1h0usnq:hover:active{border-top-color:transparent;}",
        ".fs4ktlq:hover:active{border-right-color:transparent;}",
        ".fx2bmrt:hover:active{border-left-color:transparent;}",
        ".f16h9ulv:hover:active{border-bottom-color:transparent;}"
    ],
    m: [
        [
            "@media (forced-colors: active){.f14ptb23{background-color:ButtonFace;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f9dbb4x{border-top-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f3qs60o{border-right-color:GrayText;}.f5u9ap2{border-left-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fwd1oij{border-bottom-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1cyfu5x{color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f127ot8j .fui-Button__icon{color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f19etb0b:focus{border-top-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f4f984j:focus{border-right-color:GrayText;}.fw441p0:focus{border-left-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f3d22hf:focus{border-bottom-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fj8k9ua:hover{background-color:ButtonFace;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fifrq0d:hover{border-top-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f196mwp7:hover{border-right-color:GrayText;}.fnekfq:hover{border-left-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1l6uprw:hover{border-bottom-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fa9u7a5:hover{color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1m71e0y:hover .fui-Button__icon{color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1xxg0vq:hover:active{background-color:ButtonFace;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f16oldlo:hover:active{border-top-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f17g64ui:hover:active{border-right-color:GrayText;}.fqbrke7:hover:active{border-left-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.fjvf891:hover:active{border-bottom-color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1efp33f:hover:active{color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ],
        [
            "@media (forced-colors: active){.f1gue8i:hover:active .fui-Button__icon{color:GrayText;}}",
            {
                m: "(forced-colors: active)"
            }
        ]
    ]
});
const useRootFocusStyles = /*#__PURE__*/ (0, _react.__styles)({
    circular: {
        Bw81rd7: 0,
        kdpuga: 0,
        dm238s: 0,
        B6xbmo0: 0,
        B3whbx2: "f1062rbf"
    },
    rounded: {},
    square: {
        Bw81rd7: 0,
        kdpuga: 0,
        dm238s: 0,
        B6xbmo0: 0,
        B3whbx2: "fj0ryk1"
    },
    primary: {
        B8q5s1w: "f17t0x8g",
        Bci5o5g: [
            "f194v5ow",
            "fk7jm04"
        ],
        n8qw10: "f1qgg65p",
        Bdrgwmp: [
            "fk7jm04",
            "f194v5ow"
        ],
        j6ew2k: [
            "fhgccpy",
            "fjo7pq6"
        ],
        he4mth: "f32wu9k",
        Byr4aka: "fu5nqqq",
        lks7q5: [
            "f13prjl2",
            "f1nl83rv"
        ],
        Bnan3qt: "f1czftr5",
        k1dn9: [
            "f1nl83rv",
            "f13prjl2"
        ],
        Bqsb82s: [
            "fixhny3",
            "f18mfu3r"
        ],
        jg1oma: "feygou5"
    },
    small: {
        Bw81rd7: 0,
        kdpuga: 0,
        dm238s: 0,
        B6xbmo0: 0,
        B3whbx2: "fazmxh"
    },
    medium: {},
    large: {
        Bw81rd7: 0,
        kdpuga: 0,
        dm238s: 0,
        B6xbmo0: 0,
        B3whbx2: "f1b6alqh"
    }
}, {
    d: [
        [
            ".f1062rbf[data-fui-focus-visible]{border-radius:var(--borderRadiusCircular);}",
            {
                p: -1
            }
        ],
        [
            ".fj0ryk1[data-fui-focus-visible]{border-radius:var(--borderRadiusNone);}",
            {
                p: -1
            }
        ],
        ".f17t0x8g[data-fui-focus-visible]{border-top-color:var(--colorStrokeFocus2);}",
        ".f194v5ow[data-fui-focus-visible]{border-right-color:var(--colorStrokeFocus2);}",
        ".fk7jm04[data-fui-focus-visible]{border-left-color:var(--colorStrokeFocus2);}",
        ".f1qgg65p[data-fui-focus-visible]{border-bottom-color:var(--colorStrokeFocus2);}",
        ".fhgccpy[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}",
        ".fjo7pq6[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}",
        ".f32wu9k[data-fui-focus-visible]:hover{box-shadow:var(--shadow2),0 0 0 var(--strokeWidthThin) var(--colorStrokeFocus2) inset;}",
        ".fu5nqqq[data-fui-focus-visible]:hover{border-top-color:var(--colorStrokeFocus2);}",
        ".f13prjl2[data-fui-focus-visible]:hover{border-right-color:var(--colorStrokeFocus2);}",
        ".f1nl83rv[data-fui-focus-visible]:hover{border-left-color:var(--colorStrokeFocus2);}",
        ".f1czftr5[data-fui-focus-visible]:hover{border-bottom-color:var(--colorStrokeFocus2);}",
        [
            ".fazmxh[data-fui-focus-visible]{border-radius:var(--borderRadiusSmall);}",
            {
                p: -1
            }
        ],
        [
            ".f1b6alqh[data-fui-focus-visible]{border-radius:var(--borderRadiusLarge);}",
            {
                p: -1
            }
        ]
    ],
    t: [
        "@supports (-moz-appearance:button){.f18mfu3r[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}.fixhny3[data-fui-focus-visible]{box-shadow:var(--shadow2),0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset,0 0 0 var(--strokeWidthThick) var(--colorNeutralForegroundOnBrand) inset;}}",
        "@supports (-moz-appearance:button){.feygou5[data-fui-focus-visible]:hover{box-shadow:var(--shadow2),0 0 0 calc(var(--strokeWidthThin) + 0.25px) var(--colorStrokeFocus2) inset;}}"
    ]
});
const useRootIconOnlyStyles = /*#__PURE__*/ (0, _react.__styles)({
    small: {
        Byoj8tv: 0,
        uwmqm3: 0,
        z189sj: 0,
        z8tnut: 0,
        B0ocmuz: "fu97m5z",
        Bf4jedk: "f17fgpbq",
        B2u0y6b: "f1jt17bm"
    },
    medium: {
        Byoj8tv: 0,
        uwmqm3: 0,
        z189sj: 0,
        z8tnut: 0,
        B0ocmuz: "f18ktai2",
        Bf4jedk: "fwbmr0d",
        B2u0y6b: "f44c6la"
    },
    large: {
        Byoj8tv: 0,
        uwmqm3: 0,
        z189sj: 0,
        z8tnut: 0,
        B0ocmuz: "f1hbd1aw",
        Bf4jedk: "f12clzc2",
        B2u0y6b: "fjy1crr"
    }
}, {
    d: [
        [
            ".fu97m5z{padding:1px;}",
            {
                p: -1
            }
        ],
        ".f17fgpbq{min-width:24px;}",
        ".f1jt17bm{max-width:24px;}",
        [
            ".f18ktai2{padding:5px;}",
            {
                p: -1
            }
        ],
        ".fwbmr0d{min-width:32px;}",
        ".f44c6la{max-width:32px;}",
        [
            ".f1hbd1aw{padding:7px;}",
            {
                p: -1
            }
        ],
        ".f12clzc2{min-width:40px;}",
        ".fjy1crr{max-width:40px;}"
    ]
});
const useIconStyles = /*#__PURE__*/ (0, _react.__styles)({
    small: {
        Be2twd7: "fe5j1ua",
        Bqenvij: "fjamq6b",
        a9b677: "f64fuq3",
        Bqrlyyl: "fbaiahx"
    },
    medium: {},
    large: {
        Be2twd7: "f1rt2boy",
        Bqenvij: "frvgh55",
        a9b677: "fq4mcun",
        Bqrlyyl: "f1exjqw5"
    },
    before: {
        t21cq0: [
            "f1nizpg2",
            "f1a695kz"
        ]
    },
    after: {
        Frg6f3: [
            "f1a695kz",
            "f1nizpg2"
        ]
    }
}, {
    d: [
        ".fe5j1ua{font-size:20px;}",
        ".fjamq6b{height:20px;}",
        ".f64fuq3{width:20px;}",
        ".fbaiahx{--fui-Button__icon--spacing:var(--spacingHorizontalXS);}",
        ".f1rt2boy{font-size:24px;}",
        ".frvgh55{height:24px;}",
        ".fq4mcun{width:24px;}",
        ".f1exjqw5{--fui-Button__icon--spacing:var(--spacingHorizontalSNudge);}",
        ".f1nizpg2{margin-right:var(--fui-Button__icon--spacing);}",
        ".f1a695kz{margin-left:var(--fui-Button__icon--spacing);}"
    ]
});
const useButtonStyles_unstable = (state)=>{
    'use no memo';
    const rootBaseClassName = useRootBaseClassName();
    const iconBaseClassName = useIconBaseClassName();
    const rootStyles = useRootStyles();
    const rootDisabledStyles = useRootDisabledStyles();
    const rootFocusStyles = useRootFocusStyles();
    const rootIconOnlyStyles = useRootIconOnlyStyles();
    const iconStyles = useIconStyles();
    const { appearance, disabled, disabledFocusable, icon, iconOnly, iconPosition, shape, size } = state;
    state.root.className = (0, _react.mergeClasses)(buttonClassNames.root, rootBaseClassName, appearance && rootStyles[appearance], rootStyles[size], icon && size === 'small' && rootStyles.smallWithIcon, icon && size === 'large' && rootStyles.largeWithIcon, rootStyles[shape], // Disabled styles
    (disabled || disabledFocusable) && rootDisabledStyles.base, (disabled || disabledFocusable) && rootDisabledStyles.highContrast, appearance && (disabled || disabledFocusable) && rootDisabledStyles[appearance], // Focus styles
    appearance === 'primary' && rootFocusStyles.primary, rootFocusStyles[size], rootFocusStyles[shape], // Icon-only styles
    iconOnly && rootIconOnlyStyles[size], // User provided class name
    state.root.className);
    if (state.icon) {
        state.icon.className = (0, _react.mergeClasses)(buttonClassNames.icon, iconBaseClassName, !!state.root.children && iconStyles[iconPosition], iconStyles[size], state.icon.className);
    }
    return state;
};
