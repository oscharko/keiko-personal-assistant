'use client';

import { iconFilledClassName, iconRegularClassName } from '@fluentui/react-icons';
import { createCustomFocusIndicatorStyle } from '@fluentui/react-tabster';
import { tokens } from '@fluentui/react-theme';
import { shorthands, mergeClasses, __styles } from '@griffel/react';
import { useButtonStyles_unstable } from '../Button/useButtonStyles.styles';
export const toggleButtonClassNames = {
  root: 'fui-ToggleButton',
  icon: 'fui-ToggleButton__icon'
};
const useRootCheckedStyles = /*#__PURE__*/__styles({
  base: {
    De3pzq: "f1nfm20t",
    g2u3we: "fj3muxo",
    h3c5rm: ["f1akhkt", "f1lxtadh"],
    B9xav0g: "f1aperda",
    zhjwy3: ["f1lxtadh", "f1akhkt"],
    sj55zd: "f14nttnl",
    B4j52fo: "f192inf7",
    Bekrc4i: ["f5tn483", "f1ojsxk5"],
    Bn0qgzm: "f1vxd6vx",
    ibv6hh: ["f1ojsxk5", "f5tn483"],
    D0sxk3: "fxoiby5",
    t6yez3: "f15q0o9g",
    Jwef8y: "f1knas48",
    Bgoe8wy: "fvcxoqz",
    Bwzppfd: ["f1ub3y4t", "f1m52nbi"],
    oetu4i: "f1xlaoq0",
    gg5e9n: ["f1m52nbi", "f1ub3y4t"],
    Bi91k9c: "feu1g3u",
    iro3zm: "f141de4g",
    b661bw: "f11v6sdu",
    Bk6r4ia: ["f9yn8i4", "f1ajwf28"],
    B9zn80p: "f1uwu36w",
    Bpld233: ["f1ajwf28", "f9yn8i4"],
    B2d53fq: "f9olfzr"
  },
  highContrast: {
    By8wz76: "f1nz3ub2",
    Bcq6wej: "fjq791v",
    Jcjdmf: ["fkq2p2y", "f1sehlss"],
    sc4o1m: "f11odvng",
    Bosien3: ["f1sehlss", "fkq2p2y"],
    B7iucu3: "fqc85l4",
    B8gzw0y: "f1h3a8gf",
    Bbkh6qg: "fkiggi6",
    F230oe: "f8gmj8i",
    Bdw8ktp: ["f1ap8nzx", "fjag8bx"],
    Bj1xduy: "f1igan7k",
    Bhh2cfd: ["fjag8bx", "f1ap8nzx"],
    Bahaeuw: "f1v3eptx",
    rxnm8d: "fpelvsg",
    Bso50sa: "f1r9enuy",
    B65bq0w: ["fdvt4n0", "f1grx941"],
    Buont6p: "f1l34yyb",
    B0o9ejx: ["f1grx941", "fdvt4n0"],
    Dcq74g: "fqfbdvs",
    B6rz4yo: 0,
    Buk7464: 0,
    Bqg8rp8: 0,
    pjr8j7: 0,
    Bgs2klq: 0,
    Hwei09: 0,
    Bi9aqk7: 0,
    Fihjvf: 0,
    nhyz0p: 0,
    Buw724y: 0,
    Bn7qjfh: 0,
    B0u7xl9: 0,
    md97jv: 0,
    h3ptyc: 0,
    s1kvfj: 0,
    kogrdj: 0,
    dqx2i2: "fdmpsdn",
    o0nolc: "fgjsukj"
  },
  outline: {
    De3pzq: "f1q9pm1r",
    g2u3we: "fj3muxo",
    h3c5rm: ["f1akhkt", "f1lxtadh"],
    B9xav0g: "f1aperda",
    zhjwy3: ["f1lxtadh", "f1akhkt"],
    B4j52fo: "fgx37oo",
    Bekrc4i: ["f130t4y6", "f1efpmoh"],
    Bn0qgzm: "fv51ejd",
    ibv6hh: ["f1efpmoh", "f130t4y6"],
    Jwef8y: "fjxutwb",
    iro3zm: "fwiml72",
    B8q5s1w: "fcaw57c",
    Bci5o5g: ["fpwd27e", "f1999bjr"],
    n8qw10: "f1hi52o4",
    Bdrgwmp: ["f1999bjr", "fpwd27e"]
  },
  primary: {
    De3pzq: "f8w4g0q",
    g2u3we: "f1p3nwhy",
    h3c5rm: ["f11589ue", "f1pdflbu"],
    B9xav0g: "f1q5o8ev",
    zhjwy3: ["f1pdflbu", "f11589ue"],
    sj55zd: "f1phragk",
    Jwef8y: "f15wkkf3",
    Bgoe8wy: "f1s2uweq",
    Bwzppfd: ["fr80ssc", "fecsdlb"],
    oetu4i: "f1ukrpxl",
    gg5e9n: ["fecsdlb", "fr80ssc"],
    Bi91k9c: "f1rq72xc",
    iro3zm: "fnp9lpt",
    b661bw: "f1h0usnq",
    Bk6r4ia: ["fs4ktlq", "fx2bmrt"],
    B9zn80p: "f16h9ulv",
    Bpld233: ["fx2bmrt", "fs4ktlq"],
    B2d53fq: "f1d6v5y2"
  },
  secondary: {},
  subtle: {
    De3pzq: "fq5gl1p",
    g2u3we: "f1p3nwhy",
    h3c5rm: ["f11589ue", "f1pdflbu"],
    B9xav0g: "f1q5o8ev",
    zhjwy3: ["f1pdflbu", "f11589ue"],
    sj55zd: "f1eryozh",
    Jwef8y: "f1t94bn6",
    Bgoe8wy: "f1s2uweq",
    Bwzppfd: ["fr80ssc", "fecsdlb"],
    oetu4i: "f1ukrpxl",
    gg5e9n: ["fecsdlb", "fr80ssc"],
    Bi91k9c: "fnwyq0v",
    iro3zm: "fsv2rcd",
    b661bw: "f1h0usnq",
    Bk6r4ia: ["fs4ktlq", "fx2bmrt"],
    B9zn80p: "f16h9ulv",
    Bpld233: ["fx2bmrt", "fs4ktlq"],
    B2d53fq: "f1omzyqd"
  },
  transparent: {
    De3pzq: "f1q9pm1r",
    g2u3we: "f1p3nwhy",
    h3c5rm: ["f11589ue", "f1pdflbu"],
    B9xav0g: "f1q5o8ev",
    zhjwy3: ["f1pdflbu", "f11589ue"],
    sj55zd: "f1qj7y59",
    Jwef8y: "fjxutwb",
    Bgoe8wy: "f1s2uweq",
    Bwzppfd: ["fr80ssc", "fecsdlb"],
    oetu4i: "f1ukrpxl",
    gg5e9n: ["fecsdlb", "fr80ssc"],
    Bi91k9c: "f139oj5f",
    iro3zm: "fwiml72",
    b661bw: "f1h0usnq",
    Bk6r4ia: ["fs4ktlq", "fx2bmrt"],
    B9zn80p: "f16h9ulv",
    Bpld233: ["fx2bmrt", "fs4ktlq"],
    B2d53fq: "f1fg1p5m"
  }
}, {
  d: [".f1nfm20t{background-color:var(--colorNeutralBackground1Selected);}", ".fj3muxo{border-top-color:var(--colorNeutralStroke1);}", ".f1akhkt{border-right-color:var(--colorNeutralStroke1);}", ".f1lxtadh{border-left-color:var(--colorNeutralStroke1);}", ".f1aperda{border-bottom-color:var(--colorNeutralStroke1);}", ".f14nttnl{color:var(--colorNeutralForeground1Selected);}", ".f192inf7{border-top-width:var(--strokeWidthThin);}", ".f5tn483{border-right-width:var(--strokeWidthThin);}", ".f1ojsxk5{border-left-width:var(--strokeWidthThin);}", ".f1vxd6vx{border-bottom-width:var(--strokeWidthThin);}", ".fxoiby5 .fui-Icon-filled{display:inline;}", ".f15q0o9g .fui-Icon-regular{display:none;}", ".f1q9pm1r{background-color:var(--colorTransparentBackgroundSelected);}", ".fgx37oo{border-top-width:var(--strokeWidthThicker);}", ".f130t4y6{border-right-width:var(--strokeWidthThicker);}", ".f1efpmoh{border-left-width:var(--strokeWidthThicker);}", ".fv51ejd{border-bottom-width:var(--strokeWidthThicker);}", ".fcaw57c[data-fui-focus-visible]{border-top-color:var(--colorNeutralStroke1);}", ".fpwd27e[data-fui-focus-visible]{border-right-color:var(--colorNeutralStroke1);}", ".f1999bjr[data-fui-focus-visible]{border-left-color:var(--colorNeutralStroke1);}", ".f1hi52o4[data-fui-focus-visible]{border-bottom-color:var(--colorNeutralStroke1);}", ".f8w4g0q{background-color:var(--colorBrandBackgroundSelected);}", ".f1p3nwhy{border-top-color:transparent;}", ".f11589ue{border-right-color:transparent;}", ".f1pdflbu{border-left-color:transparent;}", ".f1q5o8ev{border-bottom-color:transparent;}", ".f1phragk{color:var(--colorNeutralForegroundOnBrand);}", ".fq5gl1p{background-color:var(--colorSubtleBackgroundSelected);}", ".f1eryozh{color:var(--colorNeutralForeground2Selected);}", ".f1qj7y59{color:var(--colorNeutralForeground2BrandSelected);}"],
  h: [".f1knas48:hover{background-color:var(--colorNeutralBackground1Hover);}", ".fvcxoqz:hover{border-top-color:var(--colorNeutralStroke1Hover);}", ".f1ub3y4t:hover{border-right-color:var(--colorNeutralStroke1Hover);}", ".f1m52nbi:hover{border-left-color:var(--colorNeutralStroke1Hover);}", ".f1xlaoq0:hover{border-bottom-color:var(--colorNeutralStroke1Hover);}", ".feu1g3u:hover{color:var(--colorNeutralForeground1Hover);}", ".f141de4g:hover:active{background-color:var(--colorNeutralBackground1Pressed);}", ".f11v6sdu:hover:active{border-top-color:var(--colorNeutralStroke1Pressed);}", ".f9yn8i4:hover:active{border-right-color:var(--colorNeutralStroke1Pressed);}", ".f1ajwf28:hover:active{border-left-color:var(--colorNeutralStroke1Pressed);}", ".f1uwu36w:hover:active{border-bottom-color:var(--colorNeutralStroke1Pressed);}", ".f9olfzr:hover:active{color:var(--colorNeutralForeground1Pressed);}", ".fjxutwb:hover{background-color:var(--colorTransparentBackgroundHover);}", ".fwiml72:hover:active{background-color:var(--colorTransparentBackgroundPressed);}", ".f15wkkf3:hover{background-color:var(--colorBrandBackgroundHover);}", ".f1s2uweq:hover{border-top-color:transparent;}", ".fr80ssc:hover{border-right-color:transparent;}", ".fecsdlb:hover{border-left-color:transparent;}", ".f1ukrpxl:hover{border-bottom-color:transparent;}", ".f1rq72xc:hover{color:var(--colorNeutralForegroundOnBrand);}", ".fnp9lpt:hover:active{background-color:var(--colorBrandBackgroundPressed);}", ".f1h0usnq:hover:active{border-top-color:transparent;}", ".fs4ktlq:hover:active{border-right-color:transparent;}", ".fx2bmrt:hover:active{border-left-color:transparent;}", ".f16h9ulv:hover:active{border-bottom-color:transparent;}", ".f1d6v5y2:hover:active{color:var(--colorNeutralForegroundOnBrand);}", ".f1t94bn6:hover{background-color:var(--colorSubtleBackgroundHover);}", ".fnwyq0v:hover{color:var(--colorNeutralForeground2Hover);}", ".fsv2rcd:hover:active{background-color:var(--colorSubtleBackgroundPressed);}", ".f1omzyqd:hover:active{color:var(--colorNeutralForeground2Pressed);}", ".f139oj5f:hover{color:var(--colorNeutralForeground2BrandHover);}", ".f1fg1p5m:hover:active{color:var(--colorNeutralForeground2BrandPressed);}"],
  m: [["@media (forced-colors: active){.f1nz3ub2{background-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fjq791v{border-top-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1sehlss{border-left-color:Highlight;}.fkq2p2y{border-right-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f11odvng{border-bottom-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fqc85l4{color:HighlightText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1h3a8gf{forced-color-adjust:none;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fkiggi6:hover{background-color:HighlightText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f8gmj8i:hover{border-top-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1ap8nzx:hover{border-right-color:Highlight;}.fjag8bx:hover{border-left-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1igan7k:hover{border-bottom-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1v3eptx:hover{color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fpelvsg:hover:active{background-color:HighlightText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1r9enuy:hover:active{border-top-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1grx941:hover:active{border-left-color:Highlight;}.fdvt4n0:hover:active{border-right-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1l34yyb:hover:active{border-bottom-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fqfbdvs:hover:active{color:Highlight;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fdmpsdn:focus{border:1px solid HighlightText;}}", {
    p: -2,
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fgjsukj:focus{outline-color:Highlight;}}", {
    m: "(forced-colors: active)"
  }]]
});
const useRootDisabledStyles = /*#__PURE__*/__styles({
  base: {
    De3pzq: "f1bg9a2p",
    g2u3we: "f1jj8ep1",
    h3c5rm: ["f15xbau", "fy0fskl"],
    B9xav0g: "f4ikngz",
    zhjwy3: ["fy0fskl", "f15xbau"],
    sj55zd: "f1s2aq7o",
    Jwef8y: "f1falr9n",
    Bgoe8wy: "f12mpcsy",
    Bwzppfd: ["f1gwvigk", "f18rmfxp"],
    oetu4i: "f1jnshp0",
    gg5e9n: ["f18rmfxp", "f1gwvigk"],
    Bi91k9c: "fvgxktp",
    iro3zm: "f1t6o4dc",
    b661bw: "f10ztigi",
    Bk6r4ia: ["f1ft5sdu", "f1gzf82w"],
    B9zn80p: "f12zbtn2",
    Bpld233: ["f1gzf82w", "f1ft5sdu"],
    B2d53fq: "fcvwxyo"
  },
  outline: {},
  primary: {
    g2u3we: "f1p3nwhy",
    h3c5rm: ["f11589ue", "f1pdflbu"],
    B9xav0g: "f1q5o8ev",
    zhjwy3: ["f1pdflbu", "f11589ue"],
    Bgoe8wy: "f1s2uweq",
    Bwzppfd: ["fr80ssc", "fecsdlb"],
    oetu4i: "f1ukrpxl",
    gg5e9n: ["fecsdlb", "fr80ssc"],
    b661bw: "f1h0usnq",
    Bk6r4ia: ["fs4ktlq", "fx2bmrt"],
    B9zn80p: "f16h9ulv",
    Bpld233: ["fx2bmrt", "fs4ktlq"]
  },
  secondary: {},
  subtle: {
    De3pzq: "f1c21dwh",
    g2u3we: "f1p3nwhy",
    h3c5rm: ["f11589ue", "f1pdflbu"],
    B9xav0g: "f1q5o8ev",
    zhjwy3: ["f1pdflbu", "f11589ue"],
    Jwef8y: "fjxutwb",
    Bgoe8wy: "f1s2uweq",
    Bwzppfd: ["fr80ssc", "fecsdlb"],
    oetu4i: "f1ukrpxl",
    gg5e9n: ["fecsdlb", "fr80ssc"],
    iro3zm: "fwiml72",
    b661bw: "f1h0usnq",
    Bk6r4ia: ["fs4ktlq", "fx2bmrt"],
    B9zn80p: "f16h9ulv",
    Bpld233: ["fx2bmrt", "fs4ktlq"]
  },
  transparent: {
    De3pzq: "f1c21dwh",
    g2u3we: "f1p3nwhy",
    h3c5rm: ["f11589ue", "f1pdflbu"],
    B9xav0g: "f1q5o8ev",
    zhjwy3: ["f1pdflbu", "f11589ue"],
    Jwef8y: "fjxutwb",
    Bgoe8wy: "f1s2uweq",
    Bwzppfd: ["fr80ssc", "fecsdlb"],
    oetu4i: "f1ukrpxl",
    gg5e9n: ["fecsdlb", "fr80ssc"],
    iro3zm: "fwiml72",
    b661bw: "f1h0usnq",
    Bk6r4ia: ["fs4ktlq", "fx2bmrt"],
    B9zn80p: "f16h9ulv",
    Bpld233: ["fx2bmrt", "fs4ktlq"]
  }
}, {
  d: [".f1bg9a2p{background-color:var(--colorNeutralBackgroundDisabled);}", ".f1jj8ep1{border-top-color:var(--colorNeutralStrokeDisabled);}", ".f15xbau{border-right-color:var(--colorNeutralStrokeDisabled);}", ".fy0fskl{border-left-color:var(--colorNeutralStrokeDisabled);}", ".f4ikngz{border-bottom-color:var(--colorNeutralStrokeDisabled);}", ".f1s2aq7o{color:var(--colorNeutralForegroundDisabled);}", ".f1p3nwhy{border-top-color:transparent;}", ".f11589ue{border-right-color:transparent;}", ".f1pdflbu{border-left-color:transparent;}", ".f1q5o8ev{border-bottom-color:transparent;}", ".f1c21dwh{background-color:var(--colorTransparentBackground);}"],
  h: [".f1falr9n:hover{background-color:var(--colorNeutralBackgroundDisabled);}", ".f12mpcsy:hover{border-top-color:var(--colorNeutralStrokeDisabled);}", ".f1gwvigk:hover{border-right-color:var(--colorNeutralStrokeDisabled);}", ".f18rmfxp:hover{border-left-color:var(--colorNeutralStrokeDisabled);}", ".f1jnshp0:hover{border-bottom-color:var(--colorNeutralStrokeDisabled);}", ".fvgxktp:hover{color:var(--colorNeutralForegroundDisabled);}", ".f1t6o4dc:hover:active{background-color:var(--colorNeutralBackgroundDisabled);}", ".f10ztigi:hover:active{border-top-color:var(--colorNeutralStrokeDisabled);}", ".f1ft5sdu:hover:active{border-right-color:var(--colorNeutralStrokeDisabled);}", ".f1gzf82w:hover:active{border-left-color:var(--colorNeutralStrokeDisabled);}", ".f12zbtn2:hover:active{border-bottom-color:var(--colorNeutralStrokeDisabled);}", ".fcvwxyo:hover:active{color:var(--colorNeutralForegroundDisabled);}", ".f1s2uweq:hover{border-top-color:transparent;}", ".fr80ssc:hover{border-right-color:transparent;}", ".fecsdlb:hover{border-left-color:transparent;}", ".f1ukrpxl:hover{border-bottom-color:transparent;}", ".f1h0usnq:hover:active{border-top-color:transparent;}", ".fs4ktlq:hover:active{border-right-color:transparent;}", ".fx2bmrt:hover:active{border-left-color:transparent;}", ".f16h9ulv:hover:active{border-bottom-color:transparent;}", ".fjxutwb:hover{background-color:var(--colorTransparentBackgroundHover);}", ".fwiml72:hover:active{background-color:var(--colorTransparentBackgroundPressed);}"]
});
const useIconCheckedStyles = /*#__PURE__*/__styles({
  subtleOrTransparent: {
    sj55zd: "f1qj7y59"
  },
  highContrast: {
    B8gzw0y: "f1dd5bof"
  }
}, {
  d: [".f1qj7y59{color:var(--colorNeutralForeground2BrandSelected);}"],
  m: [["@media (forced-colors: active){.f1dd5bof{forced-color-adjust:auto;}}", {
    m: "(forced-colors: active)"
  }]]
});
const usePrimaryHighContrastStyles = /*#__PURE__*/__styles({
  base: {
    By8wz76: "f14ptb23",
    Bcq6wej: "fd7znuh",
    Jcjdmf: ["f1wh4a04", "f15h7fac"],
    sc4o1m: "f1f064oi",
    Bosien3: ["f15h7fac", "f1wh4a04"],
    B7iucu3: "f3ggph1",
    B8gzw0y: "f1dd5bof"
  },
  disabled: {
    Bcq6wej: "f9dbb4x",
    Jcjdmf: ["f3qs60o", "f5u9ap2"],
    sc4o1m: "fwd1oij",
    Bosien3: ["f5u9ap2", "f3qs60o"],
    B7iucu3: "f1cyfu5x",
    h3ptyc: "f19etb0b",
    Buw724y: ["f4f984j", "fw441p0"],
    Buk7464: "f3d22hf",
    Hwei09: ["fw441p0", "f4f984j"]
  }
}, {
  m: [["@media (forced-colors: active){.f14ptb23{background-color:ButtonFace;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fd7znuh{border-top-color:ButtonBorder;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f15h7fac{border-left-color:ButtonBorder;}.f1wh4a04{border-right-color:ButtonBorder;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1f064oi{border-bottom-color:ButtonBorder;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f3ggph1{color:ButtonText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1dd5bof{forced-color-adjust:auto;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f9dbb4x{border-top-color:GrayText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f3qs60o{border-right-color:GrayText;}.f5u9ap2{border-left-color:GrayText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.fwd1oij{border-bottom-color:GrayText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f1cyfu5x{color:GrayText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f19etb0b:focus{border-top-color:GrayText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f4f984j:focus{border-right-color:GrayText;}.fw441p0:focus{border-left-color:GrayText;}}", {
    m: "(forced-colors: active)"
  }], ["@media (forced-colors: active){.f3d22hf:focus{border-bottom-color:GrayText;}}", {
    m: "(forced-colors: active)"
  }]]
});
export const useToggleButtonStyles_unstable = state => {
  'use no memo';

  const rootCheckedStyles = useRootCheckedStyles();
  const rootDisabledStyles = useRootDisabledStyles();
  const iconCheckedStyles = useIconCheckedStyles();
  const primaryHighContrastStyles = usePrimaryHighContrastStyles();
  const {
    appearance,
    checked,
    disabled,
    disabledFocusable
  } = state;
  state.root.className = mergeClasses(toggleButtonClassNames.root,
  // Primary high contrast styles
  appearance === 'primary' && primaryHighContrastStyles.base, appearance === 'primary' && (disabled || disabledFocusable) && primaryHighContrastStyles.disabled,
  // Checked styles
  checked && rootCheckedStyles.base, checked && rootCheckedStyles.highContrast, appearance && checked && rootCheckedStyles[appearance],
  // Disabled styles
  (disabled || disabledFocusable) && rootDisabledStyles.base, appearance && (disabled || disabledFocusable) && rootDisabledStyles[appearance],
  // User provided class name
  state.root.className);
  if (state.icon) {
    state.icon.className = mergeClasses(toggleButtonClassNames.icon, checked && (appearance === 'subtle' || appearance === 'transparent') && iconCheckedStyles.subtleOrTransparent, iconCheckedStyles.highContrast, state.icon.className);
  }
  useButtonStyles_unstable(state);
  return state;
};