import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS } from "../../src/index.js";

// Ported from .NET ExcelNumberFormat TestValid and TestDefaultFormatString

const snf = new SheetNumberFormatter();
const f = (fmt: string, v: number) => {
  const r = snf.compile(fmt);
  if (!r.isSuccess) throw r.errors[0];
  return r.formatter.format(v, enUS);
};

// ─── all C# valid format strings must compile ─────────────────────────────────

const validFormats = [
  '" Excellent"', '" Fair"', '" Good"', '" Poor"', '" Very Good"',
  '"$"#,##0', '"$"#,##0.00', '"$"#,##0.00_);[Red]\\("$"#,##0.00\\)', '"$"#,##0.00_);\\("$"#,##0.00\\)',
  '"$"#,##0;[Red]\\-"$"#,##0', '"$"#,##0_);[Red]\\("$"#,##0\\)', '"$"#,##0_);\\("$"#,##0\\)',
  '"Haha!"\\ @\\ "Yeah!"', '"TRUE";"TRUE";"FALSE"', '"True";"True";"False";@',
  '"Years: "0', '"Yes";"Yes";"No";@', '"kl "hh:mm:ss;@',
  '"£"#,##0.00', '"£"#,##0;[Red]\\-"£"#,##0', '"€"#,##0.00', '"€"\\ #,##0.00_-',
  '"上午/下午 "hh"時"mm"分"ss"秒 "', '"￥"#,##0.00;"￥"\\-#,##0.00',
  '#', '# ?/?', '# ??/??',
  '#" "?/?', '#" "??/??', '#"abded"\\ ??/??',
  '###0.00;-###0.00', '###0;-###0', '##0.0E+0',
  '#,##0', '#,##0 ;(#,##0)', '#,##0 ;[Red](#,##0)',
  '#,##0"р.";[Red]\\-#,##0"р."', '#,##0.0', '#,##0.00',
  '#,##0.00 "€";-#,##0.00 "€"', '#,##0.00"р.";[Red]\\-#,##0.00"р."',
  '#,##0.000', '#,##0.0000', '#,##0.00000', '#,##0.000000',
  '#,##0.00000000;[Red]#,##0.00000000', '#,##0.0000_ ', '#,##0.000_ ',
  '#,##0.000_);\\(#,##0.000\\)', '#,##0.00;(#,##0.00)', '#,##0.00;(#,##0.00);0.00',
  '#,##0.00;[Red](#,##0.00)', '#,##0.00;[Red]\\(#,##0.00\\)', '#,##0.00;\\(#,##0.00\\)',
  '#,##0.00[$₹-449]_);\\(#,##0.00[$₹-449]\\)',
  '#,##0.00\\ "р."', '#,##0.00\\ "р.";[Red]\\-#,##0.00\\ "р."',
  '#,##0.00\\ [$€-407]', '#,##0.00\\ [$€-40C]',
  '#,##0.00_);\\(#,##0.00\\)', '#,##0.00_р_.;[Red]\\-#,##0.00_р_.', '#,##0.00_р_.;\\-#,##0.00_р_.',
  '#,##0.0;[Red]#,##0.0', '#,##0.0_ ;\\-#,##0.0\\ ', '#,##0.0_);[Red]\\(#,##0.0\\)',
  '#,##0.0_);\\(#,##0.0\\)', '#,##0;\\-#,##0;0',
  '#,##0\\ "р.";[Red]\\-#,##0\\ "р."', '#,##0\\ "р.";\\-#,##0\\ "р."',
  '#,##0\\ ;[Red]\\(#,##0\\)', '#,##0\\ ;\\(#,##0\\)',
  '#,##0_ ', '#,##0_ ;[Red]\\-#,##0\\ ', '#,##0_);[Red]\\(#,##0\\)',
  '#,##0_р_.;[Red]\\-#,##0_р_.', '#,##0_р_.;\\-#,##0_р_.',
  '#.0000,,', '#0', '#0.00', '#0.0000',
  '#\\ ?/10', '#\\ ?/2', '#\\ ?/4', '#\\ ?/8', '#\\ ?/?', '#\\ ??/100',
  '#\\ ??/100;[Red]\\(#\\ ??/16\\)', '#\\ ??/16', '#\\ ??/??',
  '#\\ ??/?????????', '#\\ ???/???',
  '**\\ #,###,#00,000.00,**',
  '0', '0"abde".0"??"000E+00', '0%', '0.0', '0.0%', '0.00', '0.00"°"', '0.00%',
  '0.000', '0.000%', '0.0000', '0.000000', '0.00000000', '0.000000000',
  '0.000000000%', '0.00000000000', '0.000000000000000',
  '0.00000000E+00', '0.0000E+00', '0.00;[Red]0.00', '0.00E+00',
  '0.00_);[Red]\\(0.00\\)', '0.00_);\\(0.00\\)', '0.0_ ',
  '00.00.00.000', '00.000%', '0000', '00000', '00000000', '000000000',
  '00000\\-0000', '00000\\-00000', '000\\-00\\-0000',
  '0;[Red]0', '0\\-00000\\-00000\\-0', '0_);[Red]\\(0\\)', '0_);\\(0\\)',
  '@', 'A/P', 'AM/PM', 'AM/PMh"時"mm"分"ss"秒";@',
  'D', 'DD', 'DD/MM/YY;@', 'DD/MM/YYYY', 'DD/MM/YYYY;@', 'DDD', 'DDDD',
  'DDDD", "MMMM\\ DD", "YYYY',
  'GENERAL', 'General',
  'H', 'H:MM:SS\\ AM/PM', 'HH:MM', 'HH:MM:SS\\ AM/PM', 'HHM', 'HHMM',
  'HH[MM]', 'HH[M]',
  'M/D/YYYY', 'M/D/YYYY\\ H:MM', 'MM/DD/YY',
  'S', 'SS',
  'YY', 'YYM', 'YYMM', 'YYMMM', 'YYMMMM', 'YYMMMMM', 'YYYY',
  'YYYY-MM-DD HH:MM:SS', 'YYYY\\-MM\\-DD',
  '[$$-409]#,##0', '[$$-409]#,##0.00',
  '[$$-409]#,##0.00_);[Red]\\([$$-409]#,##0.00\\)',
  '[$$-C09]#,##0.00',
  '[$-100042A]h:mm:ss\\ AM/PM;@', '[$-1010409]0.000%',
  '[$-1010409]General', '[$-1010409]d/m/yyyy\\ h:mm\\ AM/PM;@',
  '[$-1010409]dddd, mmmm dd, yyyy', '[$-1010409]m/d/yyyy',
  '[$-1409]h:mm:ss\\ AM/PM;@', '[$-2000000]h:mm:ss;@',
  '[$-2010401]d/mm/yyyy\\ h:mm\\ AM/PM;@', '[$-4000439]h:mm:ss\\ AM/PM;@',
  '[$-4010439]d/m/yyyy\\ h:mm\\ AM/PM;@',
  '[$-409]AM/PM\\ hh:mm:ss;@', '[$-409]d/m/yyyy\\ hh:mm;@',
  '[$-409]d\\-mmm;@', '[$-409]d\\-mmm\\-yy;@', '[$-409]d\\-mmm\\-yyyy;@',
  '[$-409]dd/mm/yyyy\\ hh:mm;@', '[$-409]dd\\-mmm\\-yy;@',
  '[$-409]h:mm:ss\\ AM/PM;@', '[$-409]h:mm\\ AM/PM;@',
  '[$-409]m/d/yy\\ h:mm\\ AM/PM;@', '[$-409]mmm\\-yy;@',
  '[$-409]mmmm\\ d\\,\\ yyyy;@', '[$-409]mmmm\\-yy;@',
  '[$-409]mmmmm;@', '[$-409]mmmmm\\-yy;@',
  '[$-40E]h\\ "óra"\\ m\\ "perckor"\\ AM/PM;@',
  '[$-412]AM/PM\\ h"시"\\ mm"분"\\ ss"초";@',
  '[$-41C]h:mm:ss\\.AM/PM;@',
  '[$-449]hh:mm:ss\\ AM/PM;@', '[$-44E]hh:mm:ss\\ AM/PM;@',
  '[$-44F]hh:mm:ss\\ AM/PM;@',
  '[$-D000409]h:mm\\ AM/PM;@', '[$-D010000]d/mm/yyyy\\ h:mm\\ "น.";@',
  '[$-F400]h:mm:ss\\ AM/PM', '[$-F800]dddd\\,\\ mmmm\\ dd\\,\\ yyyy',
  '[$AUD]\\ #,##0.00',
  '[$RD$-1C0A]#,##0.00;[Red]\\-[$RD$-1C0A]#,##0.00',
  '[$SFr.-810]\\ #,##0.00_);[Red]\\([$SFr.-810]\\ #,##0.00\\)',
  '[$£-809]#,##0.00;[Red][$£-809]#,##0.00',
  '[$¥-411]#,##0.00', '[$¥-804]#,##0.00',
  '[<0]"";0%', '[<=9999999]###\\-####;\\(###\\)\\ ###\\-####',
  '[=0]?;#,##0.00', '[=0]?;0%',
  '[=0]?;[<4.16666666666667][hh]:mm:ss;[hh]:mm',
  '[>999999]#,,"M";[>999]#,"K";#',
  '[>999999]#.000,,"M";[>999]#.000,"K";#.000',
  '[BLACK]@', '[BLUE]GENERAL', '[Black]@', '[Blue]General',
  '[CYAN]@', '[Cyan]@',
  '[DBNum1][$-804]AM/PMh"时"mm"分";@', '[DBNum1][$-804]General',
  '[DBNum1][$-804]h"时"mm"分";@',
  '[ENG][$-1004]dddd\\,\\ d\\ mmmm\\,\\ yyyy;@',
  '[ENG][$-409]d\\-mmm;@', '[ENG][$-409]mmmm\\ d\\,\\ yyyy;@',
  '[GREEN]#,###', '[Green]#,###',
  '[HH]', '[H]', '[SS]', '[S]',
  '[MAGENTA]0.00', '[Magenta]0.00',
  '[RED]#.##', '[Red]#.##',
  '[Red][<-25]General;[Blue][>25]General;[Green]General;[Yellow]General\\ ',
  '[Red][<=-25]General;[Blue][>=25]General;[Green]General;[Yellow]General',
  '[Red][<>50]General;[Blue]000', '[Red][=50]General;[Blue]000',
  '[TWN][DBNum1][$-404]y"年"m"月"d"日";@',
  '[WHITE]0.0', '[White]0.0', '[YELLOW]@', '[Yellow]@',
  '[h]', '[h]:mm:ss', '[h]:mm:ss;@', '[h]\\.mm" Uhr ";@', '[hh]',
  '[s]', '[ss]',
  '\\#\\r\\e\\c',
  '\\$#,##0_);[Red]"($"#,##0\\)',
  '\\$0.00',
  '\\C\\O\\B\\ \\o\\n\\ @', '\\C\\R\\O\\N\\T\\A\\B\\ \\o\\n\\ @',
  '\\R\\e\\s\\u\\l\\t\\ \\o\\n\\ @', '\\S\\Q\\L\\ \\:\\ @',
  '\\S\\Q\\L\\ \\R\\e\\q\\u\\e\\s\\t\\ \\f\\o\\r\\ @',
  '\\c\\c\\c?????0"aaaa"0"bbbb"000000.00%',
  '\\u\\n\\t\\i\\l\\ h:mm;@',
  '_ "￥"* #,##0.00_ "Positive";_ "￥"* \\-#,##0.00_ ;_ "￥"* "-"??_ "Negtive";_ @_ \\ "Zero"',
  '_ * #,##0_ ;_ * \\-#,##0_ ;[Red]_ * "-"_ ;_ @_ ',
  '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_))',
  '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_))',
  '_(* #,##0_);_(* \\(#,##0\\);_(* "-"_);_(@_))',
  '_-"€"\\ * #,##0.00_-;_-"€"\\ * #,##0.00\\-;_-"€"\\ * "-"??_-;_-@_-',
  '_-* #,##0.00\\ "€"_-;\\-* #,##0.00\\ "€"_-;_-* "-"??\\ "€"_-;_-@_-',
  '_-* #,##0.0\\ _F_-;\\-* #,##0.0\\ _F_-;_-* "-"??\\ _F_-;_-@_-',
  '_-* #,##0\\ "€"_-;\\-* #,##0\\ "€"_-;_-* "-"\\ "€"_-;_-@_-',
  '_-* #,##0_-;\\-* #,##0_-;_-* "-"??_-;_-@_-',
  '_-\\$* #,##0.0_ ;_-\\$* \\-#,##0.0\\ ;_-\\$* "-"?_ ;_-@_ ',
  'd', 'd-mmm', 'd-mmm-yy', 'd/m', 'd/m/yy;@', 'd/m/yyyy;@', 'd/mm/yy;@',
  'd/mm/yyyy;@', 'd\\-mmm', 'd\\-mmm\\-yyyy',
  'dd', 'dd"-"mmm"-"yyyy', 'dd/m/yyyy', 'dd/mm/yy', 'dd/mm/yy;@',
  'dd/mm/yy\\ hh:mm', 'dd/mm/yyyy', 'dd/mm/yyyy\\ hh:mm:ss', 'dd/mmm',
  'dd\\-mm\\-yy', 'dd\\-mmm\\-yy', 'dd\\-mmm\\-yyyy\\ hh:mm:ss.000',
  'dd\\/mm\\/yy', 'dd\\/mm\\/yyyy', 'ddd', 'dddd', 'dddd, mmmm dd, yyyy',
  'h', 'h"时"mm"分"ss"秒";@', 'h"時"mm"分"ss"秒";@',
  'h:mm', 'h:mm AM/PM', 'h:mm:ss', 'h:mm:ss AM/PM', 'h:mm:ss;@', 'h:mm;@',
  'h\\.mm" Uhr ";@', 'h\\.mm" h";@', 'h\\.mm" u.";@',
  'hh":\"mm AM/PM', 'hh:mm:ss', 'hh:mm:ss\\ AM/PM', 'hh\\.mm" h";@',
  'hhm', 'hhmm',
  'm"月"d"日"', 'm/d/yy', 'm/d/yy h:mm', 'm/d/yy;@', 'm/d/yy\\ h:mm',
  'm/d/yy\\ h:mm;@', 'm/d/yyyy', 'm/d/yyyy;@', 'm/d/yyyy\\ h:mm:ss;@',
  'm/d;@', 'm\\/d\\/yyyy',
  'mm/dd', 'mm/dd/yy', 'mm/dd/yy;@', 'mm/dd/yyyy',
  'mm:ss', 'mm:ss.0;@',
  'mmm d, yyyy', 'mmm" "d", "yyyy', 'mmm-yy', 'mmm-yy;@', 'mmm/yy',
  'mmm\\-yy', 'mmm\\-yy;@', 'mmm\\-yyyy',
  'mmmm\\ d\\,\\ yyyy', 'mmmm\\ yyyy', 'mmss.0',
  's', 'ss',
  'yy', 'yy/mm/dd', 'yy\\.mm\\.dd', 'yym', 'yymm', 'yymmm', 'yymmmm',
  'yymmmmm', 'yyyy', 'yyyy"年"\\ m"月"\\ d"日";@',
  'yyyy-m-d h:mm AM/PM', 'yyyy-mm-dd', 'yyyy/mm/dd',
  'yyyy\\-m\\-d\\ hh:mm:ss', 'yyyy\\-mm\\-dd', 'yyyy\\-mm\\-dd;@',
  'yyyy\\-mm\\-dd\\ h:mm', 'yyyy\\-mm\\-dd\\Thh:mm', 'yyyy\\-mm\\-dd\\Thhmmss.000',
];

describe("all C# valid format strings compile successfully", () => {
  for (const fmt of validFormats) {
    it(`compile("${fmt.length > 60 ? fmt.slice(0, 60) + "…" : fmt}") → isSuccess`, () => {
      expect(snf.compile(fmt).isSuccess, `format: ${fmt}`).toBe(true);
    });
  }
});

// ─── General / default format ────────────────────────────────────────────────

describe("General format", () => {
  it('1234.56 → "1234.56"', () => expect(f("General", 1234.56)).toBe("1234.56"));

  // C# formats Double.MaxValue as "1.79769313486232E+308" (15 sig digits, uppercase E).
  // JS String(Number.MAX_VALUE) gives "1.7976931348623157e+308" — different.
  it.todo("Number.MAX_VALUE → '1.79769313486232E+308' (C# 15-digit repr)");

  // C# uses DateTime general format ("10/28/2017 00:00:00" for InvariantCulture).
  // Our General format for dates uses short-month-name form ("28-Oct-2017").
  it.todo("new Date(2017,9,28) → '10/28/2017 00:00:00' (C# invariant)");
  it.todo("new Date(2017,9,28) sv-SE → '2017-10-28 00:00:00'");
});
