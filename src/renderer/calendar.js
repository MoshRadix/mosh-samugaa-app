/**
 * @file calendar.js
 * @description Maldives Calendar — Monthly/Yearly/Weekly views with Hijri dates,
 * Maldives public holidays, and bilingual (English/Dhivehi) support.
 * Self-contained renderer module. No IPC required.
 */

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

const CAL_LANG_KEY    = "mto_cal_lang";
const CAL_REMOTE_URL  = "https://api.npoint.io/8221abfb843e0b947998";
const CAL_CACHE_KEY   = "mto_cal_remote_holidays";
const CAL_CACHE_TS_KEY = "mto_cal_remote_ts";
const CAL_CACHE_TTL   = 24 * 60 * 60 * 1000; // 24 hours in ms

const CAL_I18N = {
  en: {
    monthNames: [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ],
    dayNamesShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    dayNamesFull: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    hijriMonths: [
      "Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani",
      "Jumada al-Awwal","Jumada al-Thani","Rajab","Sha'ban",
      "Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"
    ],
    today: "Today",
    weekView: "Week",
    monthView: "Month",
    yearView: "Year",
    holiday: "Holiday",
    weekend: "Weekend",
    publicHoliday: "Public Holiday",
    noEvents: "No events",
    language: "ދިވެހި",
    prevYear: "Previous Year",
    nextYear: "Next Year",
    prev: "‹",
    next: "›",
    weekOf: "Week of",
  },
  dv: {
    monthNames: [
      "ޖަނަވަރީ","ފެބްރުއަރީ","މާރިޗް","އޭޕްރިލް","މެއި","ޖޫން",
      "ޖުލައި","އޮގަސްޓް","ސެޕްޓެންބަރ","އޮކްޓޯބަރ","ނޮވެންބަރ","ޑިސެންބަރ"
    ],
    dayNamesShort: ["އާދި","ހޯމަ","އަން","ބުދަ","ބުރާ","ހުކުރު","ހޮނި"],
    dayNamesFull: ["އާދީއްތަ","ހޯމަ","އަންގާރަ","ބުދަ","ބުރާސްފަތި","ހުކުރު","ހޮނިހިރު"],
    hijriMonths: [
      "މުޙައްރަމް","ސަފަރު","ރަބީޢު ލްއައްވަލް","ރަބީޢު ލްއާޚިރު",
      "ޖުމާދަލްއޫލާ","ޖުމާދަ ލްއާޚިރާ","ރަޖަބް","ޝަޢްބާން",
      "ރަމަޟާން","ޝައްވާލް","ޛުލްޤަޢިދާ","ޛުލްޙިއްޖާ"
    ],
    today: "މިއަދު",
    weekView: "ހަފްތާ",
    monthView: "މަސް",
    yearView: "އަހަރު",
    holiday: "ބަންދު",
    weekend: "ހަފްތާ ބަންދު",
    publicHoliday: "ރަސްމީ ބަންދު",
    noEvents: "ހަރަކާތެއް ނެތް",
    language: "English",
    prevYear: "ކުރީ އަހަރު",
    nextYear: "ފަހު އަހަރު",
    prev: "‹",
    next: "›",
    weekOf: "ހަފްތާ:",
  }
};

/**
 * Maldives fixed public holidays (MM-DD format).
 */
const MV_FIXED_HOLIDAYS = {
  "01-01": { en: "New Year's Day",   dv: "އާ އަހަރުގެ ދުވަސް" },
  "05-01": { en: "Workers' Day",     dv: "މަސައްކަތްތެރިންގެ ދުވަސް" },
  "07-26": { en: "Independence Day", dv: "މިނިވަން ދުވަސް" },
  "07-27": { en: "Independence Day", dv: "މިނިވަން ދުވަސް" },
  "11-03": { en: "Victory Day",      dv: "ނަޞްރުގެ ދުވަސް" },
  "11-11": { en: "Republic Day",     dv: "ޖުމްހޫރީ ދުވަސް" },
};

/**
 * International observance days (MM-DD format).
 * Awareness / commemorative days — shown in a distinct colour, not public holidays.
 */
const INTL_OBSERVANCE_DAYS = {
  "01-04": { en: "World Braille Day",                                        dv: "ދުނިޔޭގެ ބްރެއިލް ދުވަސް" },
  "01-24": { en: "International Education Day",                              dv: "ބައިނަލް އަޤްވާމީ ތަޢުލީމީ ދުވަސް" },
  "01-27": { en: "Holocaust Remembrance Day",                                dv: "ހޮލޮކޯސްޓް ހަނދާންކުރުމުގެ ދުވަސް" },
  "02-04": { en: "World Cancer Day",                                         dv: "ދުނިޔޭގެ ކެންސަރ ދުވަސް" },
  "02-06": { en: "Int'l Day of Zero Tolerance for FGM",                     dv: "ބައިނަލް އަޤްވާމީ އަންހެނުން ޚިތާނުކުރުން ހުއްޓުވުމުގެ ދުވަސް" },
  "02-11": { en: "Int'l Day of Women and Girls in Science",                  dv: "ބައިނަލް އަޤްވާމީ ސައިންސްގައި އަންހެނުންނާއި އަންހެންކުދިންގެ ދުވަސް" },
  "02-13": { en: "World Radio Day",                                          dv: "ދުނިޔޭގެ ރޭޑިއޯ ދުވަސް" },
  "02-20": { en: "World Day of Social Justice",                              dv: "ދުނިޔޭގެ އިޖްތިމާޢީ ޢަދާލަތުގެ ދުވަސް" },
  "02-21": { en: "International Mother Language Day",                        dv: "ބައިނަލް އަޤްވާމީ މާދަރީ ބަހުގެ ދުވަސް" },
  "03-01": { en: "World Civil Defence Day",                                  dv: "ދުނިޔޭގެ ސިވިލް ޑިފެންސް ދުވަސް" },
  "03-03": { en: "World Wildlife Day",                                       dv: "ދުނިޔޭގެ ވައިލްޑްލައިފް ދުވަސް" },
  "03-04": { en: "World Obesity Day",                                        dv: "ދުނިޔޭގެ ފަލަކަމުގެ ދުވަސް" },
  "03-08": { en: "International Women's Day",                                dv: "ބައިނަލް އަޤްވާމީ އަންހެނުންގެ ދުވަސް" },
  "03-15": { en: "World Consumer Rights Day",                                dv: "ދުނިޔޭގެ ކޮންސިއުމަރ ޙައްޤުތަކުގެ ދުވަސް" },
  "03-20": { en: "World Happiness Day",                                      dv: "ދުނިޔޭގެ އުފާވެރިކަމުގެ ދުވަސް" },
  "03-21": { en: "World Down Syndrome Day",                                  dv: "ދުނިޔޭގެ ޑައުން ސިންޑްރޯމް ދުވަސް" },
  "03-22": { en: "World Water Day",                                          dv: "ދުނިޔޭގެ ފެނުގެ ދުވަސް" },
  "03-23": { en: "World Meteorological Day",                                 dv: "ދުނިޔޭގެ މޫސުމީ ދުވަސް" },
  "03-24": { en: "World Tuberculosis Day",                                   dv: "ދުނިޔޭގެ ޓިބީ ދުވަސް" },
  "04-02": { en: "World Autism Awareness Day",                               dv: "ދުނިޔޭގެ އޯޓިޒަމް ދުވަސް" },
  "04-07": { en: "World Health Day",                                         dv: "ދުނިޔޭގެ ޞިއްޙަތުގެ ދުވަސް" },
  "04-22": { en: "Earth Day",                                                dv: "ދުނިޔޭގެ ދުވަސް" },
  "04-23": { en: "World Book and Copyright Day",                             dv: "ދުނިޔޭގެ ފޮތާއި އަލިފުބާ ދުވަސް" },
  "04-25": { en: "World Malaria Day",                                        dv: "ދުނިޔޭގެ މެލޭރިއާ ދުވަސް" },
  "05-03": { en: "World Press Freedom Day",                                  dv: "ދުނިޔޭގެ ނޫސްވެރިކަމުގެ މިނިވަންކަމުގެ ދުވަސް" },
  "05-05": { en: "World Hand Hygiene Day",                                   dv: "ދުނިޔޭގެ އަތްދޮވުމުގެ ދުވަސް" },
  "05-08": { en: "World Red Cross Day",                                      dv: "ދުނިޔޭގެ ރެޑް ކްރޮސް ދުވަސް" },
  "05-12": { en: "International Nurses Day",                                 dv: "ބައިނަލް އަޤްވާމީ ނަރުހުންގެ ދުވަސް" },
  "05-15": { en: "International Day of Families",                            dv: "ބައިނަލް އަޤްވާމީ އާއިލާތަކުގެ ދުވަސް" },
  "05-17": { en: "World Telecommunication Day",                              dv: "ދުނިޔޭގެ ޓެލެކޮމިއުނިކޭޝަން ދުވަސް" },
  "05-18": { en: "International Museum Day",                                 dv: "ބައިނަލް އަޤްވާމީ މިއުޒިއަމް ދުވަސް" },
  "05-21": { en: "World Cultural Diversity Day",                             dv: "ދުނިޔޭގެ ސަޤާފީ ތަފާތުވެރިކަމުގެ ދުވަސް" },
  "05-22": { en: "International Day for Biological Diversity",               dv: "ބައިނަލް އަޤްވާމީ ތިމާވެށީގެ ތަފާތުވެރިކަމުގެ ދުވަސް" },
  "05-31": { en: "World No Tobacco Day",                                     dv: "ދުނިޔޭގެ ދުންފަތް ނުބޭނުންކުރާ ދުވަސް" },
  "06-05": { en: "World Environment Day",                                    dv: "ދުނިޔޭގެ ތިމާވެށީގެ ދުވަސް" },
  "06-08": { en: "World Oceans Day",                                         dv: "ދުނިޔޭގެ ކަނޑުތަކުގެ ދުވަސް" },
  "06-12": { en: "World Day Against Child Labour",                           dv: "ކުޑަކުދިން ގެންގުޅެ ދިނުން ހުއްޓުވުމުގެ ދުވަސް" },
  "06-17": { en: "World Day to Combat Desertification",                      dv: "ބިން ހަލާކުވުން ހުއްޓުވުމުގެ ދުވަސް" },
  "06-20": { en: "World Refugee Day",                                        dv: "ދުނިޔޭގެ ރެފިއުޖީންގެ ދުވަސް" },
  "06-21": { en: "World Music Day",                                          dv: "ދުނިޔޭގެ މިއުޒިކް ދުވަސް" },
  "06-26": { en: "International Day Against Drug Abuse",                     dv: "ބައިނަލް އަޤްވާމީ މަސްތުވާތަކެތި ބޭނުންކުރުމާ ދެކޮޅު ދުވަސް" },
  "07-11": { en: "World Population Day",                                     dv: "ދުނިޔޭގެ އާބާދީގެ ދުވަސް" },
  "07-18": { en: "Nelson Mandela International Day",                         dv: "ބައިނަލް އަޤްވާމީ ނެލްސަން މަންޑޭލާ ދުވަސް" },
  "07-30": { en: "World Day Against Trafficking in Persons",                 dv: "މީހުން ޓްރެފިކް ކުރުމާ ދެކޮޅު ދުވަސް" },
  "08-09": { en: "Int'l Day of the World's Indigenous Peoples",             dv: "ބައިނަލް އަޤްވާމީ ދުނިޔޭގެ އަސްލު ދިރިއުޅޭ ދަރިކޮޅުތަކުގެ ދުވަސް" },
  "08-12": { en: "International Youth Day",                                  dv: "ބައިނަލް އަޤްވާމީ ޒުވާނުންގެ ދުވަސް" },
  "08-19": { en: "World Humanitarian Day",                                   dv: "ދުނިޔޭގެ އިންސާނީ އެހީތެރިކަމުގެ ދުވަސް" },
  "09-05": { en: "International Day of Charity",                             dv: "ބައިނަލް އަޤްވާމީ ޚައިރާތުގެ ދުވަސް" },
  "09-08": { en: "International Literacy Day",                               dv: "ބައިނަލް އަޤްވާމީ ކިޔަވަން ދެނެގަތުމުގެ ދުވަސް" },
  "09-10": { en: "World Suicide Prevention Day",                             dv: "ދުނިޔޭގެ މީހުން މަރުނުގަތުމަށް ހޭލުންތެރިކުރުމުގެ ދުވަސް" },
  "09-15": { en: "International Day of Democracy",                           dv: "ބައިނަލް އަޤްވާމީ ޑިމޮކްރެސީ ދުވަސް" },
  "09-16": { en: "World Ozone Day",                                          dv: "ދުނިޔޭގެ އޯޒޯން ދުވަސް" },
  "09-21": { en: "International Day of Peace",                               dv: "ބައިނަލް އަޤްވާމީ ޞުލްޙައިގެ ދުވަސް" },
  "09-27": { en: "World Tourism Day",                                        dv: "ދުނިޔޭގެ ޓޫރިޒަމް ދުވަސް" },
  "10-01": { en: "International Day of Older Persons",                       dv: "ބައިނަލް އަޤްވާމީ އުުމުރުން ދުވަސްވީ މީހުންގެ ދުވަސް" },
  "10-02": { en: "International Day of Non-Violence",                        dv: "ބައިނަލް އަޤްވާމީ އަނިޔާ ނުކުރުމުގެ ދުވަސް" },
  "10-05": { en: "World Teachers' Day",                                      dv: "ދުނިޔޭގެ މުދައްރިސުންގެ ދުވަސް" },
  "10-09": { en: "World Post Day",                                           dv: "ދުނިޔޭގެ ޕޯސްޓް ދުވަސް" },
  "10-10": { en: "World Mental Health Day",                                  dv: "ދުނިޔޭގެ ނަފްސާނީ ޞިއްޙަތުގެ ދުވަސް" },
  "10-11": { en: "International Day of the Girl Child",                      dv: "ބައިނަލް އަޤްވާމީ އަންހެންކުދިންގެ ދުވަސް" },
  "10-13": { en: "International Day for Disaster Risk Reduction",            dv: "ބައިނަލް އަޤްވާމީ ގުދުރަތީ ކާރިސާ ކުޑަ ކުރުމުގެ ދުވަސް" },
  "10-15": { en: "World Students' Day",                                      dv: "ދުނިޔޭގެ ދަރިވަރުންގެ ދުވަސް" },
  "10-16": { en: "World Food Day",                                           dv: "ދުނިޔޭގެ ކާބޯތަކެތީގެ ދުވަސް" },
  "10-17": { en: "International Day for the Eradication of Poverty",        dv: "ބައިނަލް އަޤްވާމީ ފަގީރުކަން ނައްތާލުމުގެ ދުވަސް" },
  "10-24": { en: "United Nations Day",                                       dv: "އދ.ގެ ދުވަސް" },
  "10-31": { en: "World Cities Day",                                         dv: "ދުނިޔޭގެ ސިޓީތަކުގެ ދުވަސް" },
  "11-14": { en: "World Diabetes Day",                                       dv: "ދުނިޔޭގެ ހަކުރުބަލީގެ ދުވަސް" },
  "11-16": { en: "International Day for Tolerance",                          dv: "ބައިނަލް އަޤްވާމީ ތަޙައްމަލްކުރުމުގެ ދުވަސް" },
  "11-19": { en: "International Men's Day",                                  dv: "ބައިނަލް އަޤްވާމީ ފިރިހެނުންގެ ދުވަސް" },
  "11-20": { en: "World Children's Day",                                     dv: "ދުނިޔޭގެ ކުޑަކުދިންގެ ދުވަސް" },
  "11-21": { en: "World Television Day",                                     dv: "ދުނިޔޭގެ ޓެލެވިޝަން ދުވަސް" },
  "11-25": { en: "Int'l Day for Elimination of Violence Against Women",     dv: "ބައިނަލް އަޤްވާމީ އަންހެނުންނަށް ކުރާ އަނިޔާ ނައްތާލުމުގެ ދުވަސް" },
  "12-01": { en: "World AIDS Day",                                           dv: "ދުނިޔޭގެ އެއިޑްސް ދުވަސް" },
  "12-02": { en: "Int'l Day for the Abolition of Slavery",                  dv: "ބައިނަލް އަޤްވާމީ އަޅުވެތިކަން ނައްތާލުމުގެ ދުވަސް" },
  "12-03": { en: "Int'l Day of Persons with Disabilities",                  dv: "ބައިނަލް އަޤްވާމީ ނުކުޅެދުންތެރިކަން ހުންނަ ފަރާތްތަކުގެ ދުވަސް" },
  "12-05": { en: "World Soil Day",                                           dv: "ދުނިޔޭގެ ބިމުގެ ދުވަސް" },
  "12-09": { en: "International Anti-Corruption Day",                        dv: "ބައިނަލް އަޤްވާމީ ކޮރަޕްޝަނާ ދެކޮޅު ދުވަސް" },
  "12-10": { en: "Human Rights Day",                                         dv: "ދުނިޔޭގެ އިންސާނީ ޙައްޤުތަކުގެ ދުވަސް" },
  "12-11": { en: "International Mountain Day",                               dv: "ބައިނަލް އަޤްވާމީ ފަރުބަދަތަކުގެ ދުވަސް" },
  "12-18": { en: "International Migrants Day",                               dv: "ބައިނަލް އަޤްވާމީ ހިޖުރަވެރިންގެ ދުވަސް" },
};

// ============================================================================
// HIJRI DATE CONVERSION & DYNAMIC CALCULATIONS
// ============================================================================

/**
 * Convert a Gregorian date to Hijri using the native Intl Umm al-Qura engine.
 * Eliminates custom tabular drifts and aligns directly with Maldivian baselines.
 * Returns { year, month, day }.
 */
function gregorianToHijri(gYear, gMonth, gDay) {
  const date = new Date(gYear, gMonth - 1, gDay);
  
  const formatter = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric"
  });
  
  const parts = formatter.formatToParts(date);
  const hDay   = parseInt(parts.find(p => p.type === "day").value, 10);
  const hMonth = parseInt(parts.find(p => p.type === "month").value, 10);
  const hYear  = parseInt(parts.find(p => p.type === "year").value.replace(/\D/g, ""), 10);

  return { year: hYear, month: hMonth, day: hDay };
}

function formatHijri(gYear, gMonth, gDay, lang) {
  const h = gregorianToHijri(gYear, gMonth, gDay);
  const monthName = CAL_I18N[lang].hijriMonths[h.month - 1];
  if (lang === "dv") {
    return `${h.day} ${monthName} ${h.year}`;
  }
  return `${h.day} ${monthName} ${h.year} AH`;
}

/**
 * Dynamically computes Maldives Islamic holidays for a specific Gregorian year
 * using reverse-mapping on the native Umm al-Qura engine.
 */
function generateDynamicIslamicHolidays(gYear) {
  const holidays = [];

  const islamicHolidaysSchema = [
    { hMonth: 9,  hDay: 1,  en: "First Day of Ramadan",               dv: "ރަމަޟާން ފެށޭ ދުވަސް" },
    { hMonth: 10, hDay: 1,  en: "Eid al-Fitr (Day 1)",                dv: "ފިތުރު ޢީދު (1 ވަނަ ދުވަސް)" },
    { hMonth: 10, hDay: 2,  en: "Eid al-Fitr (Day 2)",                dv: "ފިތުރު ޢީދު (2 ވަނަ ދުވަސް)" },
    { hMonth: 10, hDay: 3,  en: "Eid al-Fitr (Day 3)",                dv: "ފިތުރު ޢީދު (3 ވަނަ ދުވަސް)" },
    { hMonth: 12, hDay: 9,  en: "Day of Arafat (Hajj Day)",           dv: "އަރަފާތް ދުވަސް" },
    { hMonth: 12, hDay: 10, en: "Eid al-Adha (Day 1)",                dv: "އަޟްހާ ޢީދު (1 ވަނަ ދުވަސް)" },
    { hMonth: 12, hDay: 11, en: "Eid al-Adha (Day 2)",                dv: "އަޟްހާ ޢީދު (2 ވަނަ ދުވަސް)" },
    { hMonth: 12, hDay: 12, en: "Eid al-Adha (Day 3)",                dv: "އަޟްހާ ޢީދު (3 ވަނަ ދުވަސް)" },
    { hMonth: 1,  hDay: 1,  en: "Islamic New Year",                   dv: "ހިޖްރީ އާ އަހަރު" },
    { hMonth: 3,  hDay: 1,  en: "National Day",                       dv: "ޤައުމީ ދުވަސް" },
    { hMonth: 3,  hDay: 12, en: "Mawlid al-Nabi (Prophet's Birthday)", dv: "މީލާދުންނަބީ" },
    { hMonth: 4,  hDay: 2,  en: "The Day Maldives Embraced Islam",    dv: "ރާއްޖެ އިސްލާމްވި ދުވަސް" }
  ];

  // Map out a wide Gregorian window around the year to catch overlapping months
  const startDate = new Date(gYear - 1, 10, 1);
  const endDate = new Date(gYear + 1, 1, 15);

  const formatter = new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
    day: "numeric", month: "numeric", year: "numeric"
  });

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const parts = formatter.formatToParts(d);
    const hDay = parseInt(parts.find(p => p.type === "day").value, 10);
    const hMonth = parseInt(parts.find(p => p.type === "month").value, 10);
    
    const match = islamicHolidaysSchema.find(h => h.hMonth === hMonth && h.hDay === hDay);
    
    if (match) {
      const computedY = d.getFullYear();
      if (computedY === gYear) {
        const yyyy = computedY;
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        
        holidays.push({
          date: `${yyyy}-${mm}-${dd}`,
          en: match.en,
          dv: match.dv,
          type: "islamic"
        });
      }
    }
  }

  return holidays;
}

// ============================================================================
// HOLIDAY LOOKUP
// ============================================================================

/** * Build a fast lookup map keyed by "YYYY-MM-DD".
 * Generates an active rolling calculation window around the current viewed year.
 */
function buildHolidayMap(targetYear) {
  const map = {};
  const startYr = targetYear - 3;
  const endYr = targetYear + 5;

  // 1. Populate Fixed Gregorian Holidays
  for (const [mmdd, names] of Object.entries(MV_FIXED_HOLIDAYS)) {
    for (let yr = startYr; yr <= endYr; yr++) {
      map[`${yr}-${mmdd}`] = { ...names, type: "fixed" };
    }
  }

  // 2. Populate Mathematically Generated Islamic Holidays
  for (let yr = startYr; yr <= endYr; yr++) {
    const dynamicIslamic = generateDynamicIslamicHolidays(yr);
    for (const h of dynamicIslamic) {
      map[h.date] = { en: h.en, dv: h.dv, type: "islamic" };
    }
  }

  return map;
}

/** Build a fast lookup map for international observance days keyed by "YYYY-MM-DD". */
function buildObservanceMap(targetYear) {
  const map = {};
  const startYr = targetYear - 1;
  const endYr = targetYear + 3;
  for (const [mmdd, names] of Object.entries(INTL_OBSERVANCE_DAYS)) {
    for (let yr = startYr; yr <= endYr; yr++) {
      map[`${yr}-${mmdd}`] = { ...names, type: "observance" };
    }
  }
  return map;
}

let CAL_OBSERVANCE_MAP = buildObservanceMap(new Date().getFullYear());
let _lastObsMappedYear = new Date().getFullYear();

function getObservanceInfo(year, month1based, day) {
  if (year !== _lastObsMappedYear) {
    CAL_OBSERVANCE_MAP = buildObservanceMap(year);
    _lastObsMappedYear = year;
  }
  const key = `${year}-${String(month1based).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  return CAL_OBSERVANCE_MAP[key] || null;
}

// Live map setup
let CAL_HOLIDAY_MAP = buildHolidayMap(new Date().getFullYear());
let _lastMappedYear = new Date().getFullYear();

// Sync status: "idle" | "loading" | "ok" | "cached" | "error"
let _calSyncStatus = "idle";
let _calSyncMeta   = null; 

/** Merge a flat array of {date, en, dv, type} entries into the live map */
function mergeRemoteHolidays(entries) {
  for (const h of entries) {
    if (!h.date || !h.en) continue;
    CAL_HOLIDAY_MAP[h.date] = {
      en:          h.en,
      dv:          h.dv || h.en,
      type:        "declared",
      gazette_ref: h.gazette_ref || null,
      remote:      true,
    };
  }
}

/** Fetch remote overrides from the server */
async function fetchRemoteHolidays() {
  _calSyncStatus = "loading";
  renderSyncStatus();

  const cachedTs   = parseInt(localStorage.getItem(CAL_CACHE_TS_KEY) || "0", 10);
  const cachedData = localStorage.getItem(CAL_CACHE_KEY);
  const age        = Date.now() - cachedTs;

  if (cachedData && age < CAL_CACHE_TTL) {
    try {
      const parsed = JSON.parse(cachedData);
      const entries = flattenRemoteJson(parsed);
      mergeRemoteHolidays(entries);
      _calSyncMeta   = { last_updated: parsed.last_updated, source: parsed.source };
      _calSyncStatus = "cached";
      renderSyncStatus();
      renderCalendar();
      return;
    } catch (_) { /* corrupt cache fallback */ }
  }

  try {
    const resp = await fetch(CAL_REMOTE_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    const entries = flattenRemoteJson(json);
    mergeRemoteHolidays(entries);

    _calSyncMeta   = { last_updated: json.last_updated, source: json.source };
    _calSyncStatus = "ok";

    localStorage.setItem(CAL_CACHE_KEY,    JSON.stringify(json));
    localStorage.setItem(CAL_CACHE_TS_KEY, String(Date.now()));
  } catch (err) {
    console.warn("[Calendar] Remote holiday fetch failed:", err.message);
    if (cachedData) {
      try {
        const parsed  = JSON.parse(cachedData);
        const entries = flattenRemoteJson(parsed);
        mergeRemoteHolidays(entries);
        _calSyncMeta   = { last_updated: parsed.last_updated, source: parsed.source };
      } catch (_) { }
    }
    _calSyncStatus = "error";
  }

  renderSyncStatus();
  renderCalendar();
}

function flattenRemoteJson(json) {
  const entries = [];
  if (!json || typeof json.years !== "object") return entries;
  for (const yearEntries of Object.values(json.years)) {
    if (Array.isArray(yearEntries)) entries.push(...yearEntries);
  }
  return entries;
}

async function refreshRemoteHolidays() {
  localStorage.removeItem(CAL_CACHE_KEY);
  localStorage.removeItem(CAL_CACHE_TS_KEY);
  CAL_HOLIDAY_MAP = buildHolidayMap(_calState.year);
  await fetchRemoteHolidays();
}

function getHolidayInfo(year, month1based, day) {
  const key = `${year}-${String(month1based).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  return CAL_HOLIDAY_MAP[key] || null;
}

function isWeekend(dayOfWeek) {
  return dayOfWeek === 5 || dayOfWeek === 6;
}

// ============================================================================
// STATE
// ============================================================================

let _calState = {
  view: "month",      
  lang: "en",
  year: new Date().getFullYear(),
  month: new Date().getMonth(), 
  weekStart: null,   
  selectedDate: null, 
};

function calLoadState() {
  _calState.lang = localStorage.getItem(CAL_LANG_KEY) || "en";
  const today = new Date();
  _calState.year  = today.getFullYear();
  _calState.month = today.getMonth();
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay());
  _calState.weekStart = d;
}

function calSaveLang() {
  localStorage.setItem(CAL_LANG_KEY, _calState.lang);
}

// ============================================================================
// RENDERING HELPERS
// ============================================================================

function t(key) { return CAL_I18N[_calState.lang][key] || key; }

function calDayCell(year, month1, day, opts = {}) {
  const { outsideMonth = false, compact = false } = opts;
  const date  = new Date(year, month1 - 1, day);
  const dow   = date.getDay();
  const weekend = isWeekend(dow);
  const holiday   = getHolidayInfo(year, month1, day);
  const observance = !outsideMonth ? getObservanceInfo(year, month1, day) : null;
  const today   = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const dateStr = `${year}-${String(month1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  const isSelected = _calState.selectedDate === dateStr;

  const hijri = gregorianToHijri(year, month1, day);
  const hijriMonths = CAL_I18N[_calState.lang].hijriMonths;

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPast = !outsideMonth && date < todayMidnight;

  let classes = "cal-day";
  if (outsideMonth) classes += " cal-day--outside";
  if (isPast)       classes += " cal-day--past";
  if (weekend)      classes += " cal-day--weekend";
  if (holiday) {
    if (holiday.type === "declared" || holiday.type === "special") {
      classes += " cal-day--declared";
    } else {
      classes += " cal-day--holiday";
    }
  }
  if (!holiday && observance) classes += " cal-day--observance";
  if (isToday)      classes += " cal-day--today";
  if (isSelected)   classes += " cal-day--selected";
  if (compact)      classes += " cal-day--compact";

  const holidayLabel = holiday
    ? `<div class="cal-day-holiday-label">${holiday[_calState.lang]}</div>`
    : (observance ? `<div class="cal-day-observance-label">${observance[_calState.lang]}</div>` : "");
  const observanceDot = observance ? `<span class="cal-observance-dot" title="${observance[_calState.lang]}"></span>` : "";
  const hijriLabel = compact
    ? `<div class="cal-day-hijri">${hijri.day}</div>`
    : `<div class="cal-day-hijri">${hijri.day} ${hijriMonths[hijri.month - 1]}</div>`;

  return `
    <div class="${classes}" data-date="${dateStr}" data-year="${year}" data-month="${month1}" data-day="${day}">
      <div class="cal-day-greg">${day}${observanceDot}</div>
      ${hijriLabel}
      ${holidayLabel}
    </div>
  `;
}

// ============================================================================
// VIEW: MONTH
// ============================================================================

function renderMonthView(container) {
  const { year, month, lang } = _calState;
  const L = CAL_I18N[lang];
  const firstDay = new Date(year, month, 1).getDay(); 
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  let html = `
    <div class="cal-month-grid">
      <div class="cal-weekday-header">
        ${L.dayNamesShort.map((d, i) => `<div class="cal-weekday-label${isWeekend(i) ? " cal-weekday-label--weekend" : ""}">${d}</div>`).join("")}
      </div>
      <div class="cal-days-grid">
  `;

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 12 : month;
    const prevYear  = month === 0 ? year - 1 : year;
    html += calDayCell(prevYear, prevMonth, d, { outsideMonth: true, compact: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    html += calDayCell(year, month + 1, d, { compact: false });
  }

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const trailing = totalCells - firstDay - daysInMonth;
  for (let d = 1; d <= trailing; d++) {
    const nextMonth = month === 11 ? 1 : month + 2;
    const nextYear  = month === 11 ? year + 1 : year;
    html += calDayCell(nextYear, nextMonth, d, { outsideMonth: true, compact: true });
  }

  html += `</div></div>`;
  container.innerHTML = html;
  attachDayClickHandlers(container);
}

// ============================================================================
// VIEW: WEEK
// ============================================================================

function renderWeekView(container) {
  const { lang } = _calState;
  const L = CAL_I18N[lang];
  const weekStart = new Date(_calState.weekStart);

  let html = `<div class="cal-week-grid">`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const year   = d.getFullYear();
    const month1 = d.getMonth() + 1;
    const day    = d.getDate();
    const dow    = d.getDay();
    const weekend = isWeekend(dow);
    const holiday = getHolidayInfo(year, month1, day);
    const observance = getObservanceInfo(year, month1, day);
    const today   = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const dateStr = `${year}-${String(month1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const isSelected = _calState.selectedDate === dateStr;
    const hijri = gregorianToHijri(year, month1, day);
    const hijriMonths = CAL_I18N[lang].hijriMonths;

    let classes = "cal-week-day";
    if (weekend)    classes += " cal-week-day--weekend";
    if (holiday) {
      if (holiday.type === "declared" || holiday.type === "special") {
        classes += " cal-week-day--declared";
      } else {
        classes += " cal-week-day--holiday";
      }
    }
    if (!holiday && observance) classes += " cal-week-day--observance";
    if (isToday)    classes += " cal-week-day--today";
    if (isSelected) classes += " cal-week-day--selected";
    const todayMidnightW = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (d < todayMidnightW && !isToday) classes += " cal-week-day--past";

    html += `
      <div class="${classes}" data-date="${dateStr}" data-year="${year}" data-month="${month1}" data-day="${day}">
        <div class="cal-week-day-header">
          <span class="cal-week-day-name">${L.dayNamesShort[dow]}</span>
          <span class="cal-week-day-num">${day}${observance ? `<span class="cal-observance-dot cal-observance-dot--week" title="${observance[lang]}"></span>` : ""}</span>
          <span class="cal-week-month">${L.monthNames[d.getMonth()].slice(0, _calState.lang === "dv" ? 4 : 3)}</span>
        </div>
        <div class="cal-week-hijri">${hijri.day} ${hijriMonths[hijri.month - 1]} ${hijri.year}</div>
        ${holiday ? `<div class="cal-week-holiday-label">${holiday[lang]}</div>` : ""}
        ${!holiday && observance ? `<div class="cal-week-observance-label">🌐 ${observance[lang]}</div>` : ""}
        ${weekend && !holiday ? `<div class="cal-week-weekend-label">${t("weekend")}</div>` : ""}
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
  attachDayClickHandlers(container);
}

// ============================================================================
// VIEW: YEAR
// ============================================================================

function renderYearView(container) {
  const { year, lang } = _calState;
  const L = CAL_I18N[lang];

  let html = `<div class="cal-year-grid">`;

  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(year, m, 1).getDay();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const prevDays = new Date(year, m, 0).getDate();

    html += `
      <div class="cal-year-month" data-month="${m}">
        <div class="cal-year-month-title">${L.monthNames[m]}</div>
        <div class="cal-year-weekday-row">
          ${L.dayNamesShort.map((d, i) => `<span class="${isWeekend(i) ? "cal-year-wd--weekend" : ""}">${d}</span>`).join("")}
        </div>
        <div class="cal-year-days">
    `;

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const pMonth = m === 0 ? 12 : m;
      const pYear  = m === 0 ? year - 1 : year;
      html += calDayCell(pYear, pMonth, d, { outsideMonth: true, compact: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      html += calDayCell(year, m + 1, d, { compact: true });
    }

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const trailing = totalCells - firstDay - daysInMonth;
    for (let d = 1; d <= trailing; d++) {
      const nMonth = m === 11 ? 1 : m + 2;
      const nYear  = m === 11 ? year + 1 : year;
      html += calDayCell(nYear, nMonth, d, { outsideMonth: true, compact: true });
    }

    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
  attachDayClickHandlers(container);
}

// ============================================================================
// SELECTED DAY DETAIL PANEL
// ============================================================================

function renderDayDetail() {
  const panel = document.getElementById("cal-detail-panel");
  if (!panel) return;

  if (!_calState.selectedDate) {
    panel.innerHTML = `<div class="cal-detail-empty">${t("noEvents")}</div>`;
    return;
  }

  const [year, month1, day] = _calState.selectedDate.split("-").map(Number);
  const date = new Date(year, month1 - 1, day);
  const dow = date.getDay();
  const L = CAL_I18N[_calState.lang];
  const holiday = getHolidayInfo(year, month1, day);
  const observance = getObservanceInfo(year, month1, day);
  const hijri = gregorianToHijri(year, month1, day);
  const weekend = isWeekend(dow);

  let badges = "";
  if (weekend)  badges += `<span class="cal-badge cal-badge--weekend">${t("weekend")}</span>`;
  if (holiday) {
    const typeClass = (holiday.type === "declared" || holiday.type === "special")
      ? "cal-badge--declared"
      : "cal-badge--holiday";
    badges += `<span class="cal-badge ${typeClass}">${t("publicHoliday")}</span>`;
  }
  if (!holiday && observance) {
    const obsLabel = _calState.lang === "en" ? "Int'l Day" : "ބައިނަލް އަޤްވާމީ";
    badges += `<span class="cal-badge cal-badge--observance">🌐 ${obsLabel}</span>`;
  }

  const gazetteHtml = holiday?.gazette_ref
    ? `<div class="cal-detail-gazette">📋 ${holiday.gazette_ref}</div>`
    : "";

  const observanceHtml = (!holiday && observance)
    ? `<div class="cal-detail-observance-name">🌐 ${observance[_calState.lang]}</div>`
    : "";

  panel.innerHTML = `
    <div class="cal-detail-date">
      <div class="cal-detail-greg">
        <span class="cal-detail-day-num">${day}</span>
        <div class="cal-detail-day-info">
          <span class="cal-detail-dow">${L.dayNamesFull[dow]}</span>
          <span class="cal-detail-monthyear">${L.monthNames[month1 - 1]} ${year}</span>
        </div>
      </div>
      <div class="cal-detail-hijri">
        ${hijri.day} ${L.hijriMonths[hijri.month - 1]} ${hijri.year} AH
      </div>
      ${badges ? `<div class="cal-detail-badges">${badges}</div>` : ""}
      ${holiday ? `<div class="cal-detail-holiday-name">${holiday[_calState.lang]}</div>` : ""}
      ${gazetteHtml}
      ${observanceHtml}
    </div>
  `;
}

// ============================================================================
// SYNC STATUS PILL
// ============================================================================

function renderSyncStatus() {
  const el = document.getElementById("cal-sync-status");
  if (!el) return;

  const icons = { loading: "⟳", ok: "✓", cached: "✓", error: "⚠", idle: "" };
  const labels = {
    loading: "Checking for updates…",
    ok:      _calSyncMeta ? `Updated ${_calSyncMeta.last_updated}` : "Holidays up to date",
    cached:  _calSyncMeta ? `Cached · ${_calSyncMeta.last_updated}` : "Cached",
    error:   "Could not reach server — using local data",
    idle:    "",
  };

  el.dataset.status = _calSyncStatus;
  el.innerHTML = `
    <span class="cal-sync-icon">${icons[_calSyncStatus]}</span>
    <span class="cal-sync-label">${labels[_calSyncStatus]}</span>
    ${_calSyncStatus !== "loading"
      ? `<button class="cal-sync-refresh" id="cal-sync-refresh-btn" title="Refresh holidays from server">↺</button>`
      : ""}
  `;

  document.getElementById("cal-sync-refresh-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    refreshRemoteHolidays();
  });
}

// ============================================================================
// NAVIGATION
// ============================================================================

function calNavigate(direction) {
  if (_calState.view === "month") {
    _calState.month += direction;
    if (_calState.month > 11) { _calState.month = 0; _calState.year++; }
    if (_calState.month < 0)  { _calState.month = 11; _calState.year--; }
  } else if (_calState.view === "year") {
    _calState.year += direction;
  } else if (_calState.view === "week") {
    const ws = new Date(_calState.weekStart);
    ws.setDate(ws.getDate() + direction * 7);
    _calState.weekStart = ws;
    _calState.year  = ws.getFullYear();
    _calState.month = ws.getMonth();
  }
  renderCalendar();
}

function calGoToday() {
  const today = new Date();
  _calState.year  = today.getFullYear();
  _calState.month = today.getMonth();
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay());
  _calState.weekStart = d;
  _calState.selectedDate = null;
  renderCalendar();
}

// ============================================================================
// HEADER TITLE
// ============================================================================

function calHeaderTitle() {
  const { view, year, month, lang } = _calState;
  const L = CAL_I18N[lang];
  if (view === "year")  return `${year}`;
  if (view === "month") return `${L.monthNames[month]} ${year}`;
  if (view === "week") {
    const ws = new Date(_calState.weekStart);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    const sliceLen = _calState.lang === "dv" ? 4 : 3;
    const sm = L.monthNames[ws.getMonth()].slice(0, sliceLen);
    const em = L.monthNames[we.getMonth()].slice(0, sliceLen);
    if (ws.getMonth() === we.getMonth()) {
      return `${sm} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
    }
    return `${sm} ${ws.getDate()} – ${em} ${we.getDate()}, ${we.getFullYear()}`;
  }
  return "";
}

// ============================================================================
// MAIN RENDER
// ============================================================================

function renderCalendar() {
  const titleEl   = document.getElementById("cal-title");
  const bodyEl    = document.getElementById("cal-body");
  const langBtn   = document.getElementById("cal-lang-btn");
  if (!titleEl || !bodyEl) return;

  // Track dynamic year browsing state to shift calculation matrices seamlessly
  if (_calState.year !== _lastMappedYear) {
    CAL_HOLIDAY_MAP = buildHolidayMap(_calState.year);
    _lastMappedYear = _calState.year;
    
    // Maintain secondary mapping integrity for active network caching buffers
    const cachedData = localStorage.getItem(CAL_CACHE_KEY);
    if (cachedData) {
      try { mergeRemoteHolidays(flattenRemoteJson(JSON.parse(cachedData))); } catch(_) {}
    }
  }

  const container = bodyEl.closest(".cal-container");
  if (container) container.classList.toggle("cal-lang--dv", _calState.lang === "dv");

  titleEl.textContent = calHeaderTitle();
  if (langBtn) langBtn.textContent = t("language");

  ["week","month","year"].forEach(v => {
    const btn = document.getElementById(`cal-view-${v}`);
    if (btn) btn.classList.toggle("active", _calState.view === v);
    if (btn) btn.textContent = t(`${v}View`);
  });

  const todayBtn = document.getElementById("cal-today-btn");
  if (todayBtn) todayBtn.textContent = t("today");

  bodyEl.innerHTML = "";
  bodyEl.className = `cal-body cal-body--${_calState.view}`;

  if (_calState.view === "month") renderMonthView(bodyEl);
  else if (_calState.view === "week") renderWeekView(bodyEl);
  else if (_calState.view === "year") renderYearView(bodyEl);

  renderDayDetail();

  if (_calState.view === "week") {
    const ws = _calState.weekStart;
    _calState.month = ws.getMonth();
    _calState.year  = ws.getFullYear();
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function attachDayClickHandlers(container) {
  container.querySelectorAll("[data-date]").forEach(el => {
    el.addEventListener("click", () => {
      const ds = el.dataset.date;
      _calState.selectedDate = _calState.selectedDate === ds ? null : ds;
      container.querySelectorAll("[data-date]").forEach(e => {
        const isThis = e.dataset.date === _calState.selectedDate;
        e.classList.toggle("cal-day--selected", isThis);
        e.classList.toggle("cal-week-day--selected", isThis);
      });
      renderDayDetail();
    });
  });
}

// ============================================================================
// INIT
// ============================================================================

let _calendarInitialized = false;

function initCalendar() {
  if (_calendarInitialized) {
    renderCalendar();
    return;
  }
  _calendarInitialized = true;

  calLoadState();
  fetchRemoteHolidays();

  ["week","month","year"].forEach(v => {
    document.getElementById(`cal-view-${v}`)?.addEventListener("click", () => {
      _calState.view = v;
      renderCalendar();
    });
  });

  document.getElementById("cal-prev-btn")?.addEventListener("click", () => calNavigate(-1));
  document.getElementById("cal-next-btn")?.addEventListener("click", () => calNavigate(1));
  document.getElementById("cal-today-btn")?.addEventListener("click", calGoToday);

  document.getElementById("cal-lang-btn")?.addEventListener("click", () => {
    _calState.lang = _calState.lang === "en" ? "dv" : "en";
    calSaveLang();
    renderCalendar();
  });

  renderCalendar();
}