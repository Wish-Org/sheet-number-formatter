import { describe, it, expect } from "vitest";
import { localeFromIntl } from "../../src/locale/localeFromIntl.js";

// Expected separators for all Better Reports supported locales.
// Format: [bcp47Tag, groupSeparator, decimalSeparator, label]
// Source locale codes converted from Java-style (es_AR) to BCP 47 (es-AR).
// Legacy codes: iw_IL → he-IL, in_ID → id-ID
//
// Space variants used by Intl on modern Node.js/ICU:
//      = NBSP (non-breaking space) — most European locales
//      = NNBSP (narrow no-break space) — fr-FR and some others
//   ’  = RIGHT SINGLE QUOTATION MARK — de-CH thousands separator

const NBSP  = " ";
const NNBSP = " ";
const RSQM  = "’"; // de-CH thousands separator

const LOCALES: [string, string, string, string][] = [
  ["es-AR", ".",    ",",  "Argentina"],
  ["hy-AM", NBSP,  ",",  "Armenia"],
  ["en-AU", ",",    ".",  "Australia"],
  ["az-AZ", ".",    ",",  "Azerbaijan"],
  ["be-BY", NBSP,  ",",  "Belarus"],
  ["es-BO", ".",    ",",  "Bolivia"],
  ["pt-BR", ".",    ",",  "Brazil"],
  ["bg-BG", NBSP,  ",",  "Bulgaria"],
  ["en-CA", ",",    ".",  "Canada (English)"],
  ["fr-CA", NBSP,  ",",  "Canada (French)"],
  ["es-CL", ".",    ",",  "Chile"],
  ["zh-CN", ",",    ".",  "China"],
  ["es-CO", ".",    ",",  "Colombia"],
  ["hr-HR", ".",    ",",  "Croatia"],
  ["cs-CZ", NBSP,  ",",  "Czechia"],
  ["da-DK", ".",    ",",  "Denmark"],
  ["es-EC", ".",    ",",  "Ecuador"],
  ["ar-EG", "٬", "٫", "Egypt"],
  ["fi-FI", NBSP,  ",",  "Finland"],
  ["fr-FR", NNBSP, ",",  "France"],
  ["ka-GE", NBSP,  ",",  "Georgia"],
  ["de-DE", ".",    ",",  "Germany"],
  ["el-GR", ".",    ",",  "Greece"],
  ["zh-HK", ",",    ".",  "Hong Kong"],
  ["hu-HU", NBSP,  ",",  "Hungary"],
  ["hi-IN", ",",    ".",  "India"],
  ["bn-IN", ",",    ".",  "India (Bengali)"],
  ["gu-IN", ",",    ".",  "India (Gujarati)"],
  ["kn-IN", ",",    ".",  "India (Kannada)"],
  ["ml-IN", ",",    ".",  "India (Malayalam)"],
  ["mr-IN", ",",    ".",  "India (Marathi)"],
  ["pa-IN", ",",    ".",  "India (Panjabi)"],
  ["ta-IN", ",",    ".",  "India (Tamil)"],
  ["te-IN", ",",    ".",  "India (Telugu)"],
  ["id-ID", ".",    ",",  "Indonesia"],
  ["en-IE", ",",    ".",  "Ireland"],
  ["he-IL", ",",    ".",  "Israel"],
  ["it-IT", ".",    ",",  "Italy"],
  ["ja-JP", ",",    ".",  "Japan"],
  ["kk-KZ", NBSP,  ",",  "Kazakhstan"],
  ["lv-LV", NBSP,  ",",  "Latvia"],
  ["lt-LT", NBSP,  ",",  "Lithuania"],
  ["es-MX", ",",    ".",  "Mexico"],
  ["mn-MN", ",",    ".",  "Mongolia"],
  ["my-MM", ",",    ".",  "Myanmar (Burma)"],
  ["nl-NL", ".",    ",",  "Netherlands"],
  ["no-NO", NBSP,  ",",  "Norway (Norwegian Bokmal)"],
  ["nn-NO", NBSP,  ",",  "Norway (Norwegian Nynorsk)"],
  ["es-PY", ".",    ",",  "Paraguay"],
  ["fil-PH", ",",   ".",  "Philippines"],
  ["pl-PL", NBSP,  ",",  "Poland"],
  ["pt-PT", NBSP,  ",",  "Portugal"],
  ["ro-RO", ".",    ",",  "Romania"],
  ["ru-RU", NBSP,  ",",  "Russia"],
  ["sr-RS", ".",    ",",  "Serbia"],
  ["sk-SK", NBSP,  ",",  "Slovakia"],
  ["sl-SI", ".",    ",",  "Slovenia"],
  ["ko-KR", ",",    ".",  "South Korea"],
  ["es-ES", ".",    ",",  "Spain"],
  ["ca-ES", ".",    ",",  "Spain (Catalan)"],
  ["sv-SE", NBSP,  ",",  "Sweden"],
  ["de-CH", RSQM,  ".",  "Switzerland"],
  ["zh-TW", ",",    ".",  "Taiwan"],
  ["th-TH", ",",    ".",  "Thailand"],
  ["tr-TR", ".",    ",",  "Turkey"],
  ["uk-UA", NBSP,  ",",  "Ukraine"],
  ["en-GB", ",",    ".",  "United Kingdom"],
  ["cy-GB", ",",    ".",  "United Kingdom (Welsh)"],
  ["en-US", ",",    ".",  "United States"],
  ["es-UY", ".",    ",",  "Uruguay"],
  ["es-VE", ".",    ",",  "Venezuela"],
  ["vi-VN", ".",    ",",  "Vietnam"],
];

describe("Better Reports supported locales — separator sanity check", () => {
  it.each(LOCALES)("%s — %s", (tag, expectedGroup, expectedDecimal, label) => {
    const locale = localeFromIntl(tag);
    expect(locale.groupSeparator, `${tag} (${label}) group separator`).toBe(expectedGroup);
    expect(locale.decimalSeparator, `${tag} (${label}) decimal separator`).toBe(expectedDecimal);
  });
});
