/**
 * @file prayertimes.js
 * @description Prayer Times module for MTO Document Generator.
 * Addu City (Gan), Maldives — Namaadhu app pre-computed database.
 * Coordinates: 0.629°N, 73.099°E  |  UTC+5 (MVT)
 */

// ============================================================================
// PRAYER TIMES MODULE — Addu City (Gan), Maldives
// Coordinates: 0.629°N, 73.099°E  |  UTC+5 (MVT)
// ALGORITHM: Namaadhu app database method (com.daybreak.android.dharus)
//   Times are sourced from the app's pre-computed prayertimesdb (Hithadhoo
//   station, number=82, adj_min=0).  The DB stores all prayer times keyed to
//   1972 as a reference year; we index by day-of-year (0-based, Feb 29 always
//   at index 59) and replace the year at lookup time — exactly mirroring the
//   app's r.a.l() / r.a.m() round-trip.
// ============================================================================

const PT_LAT  =  0.629;
const PT_LNG  = 73.099;
const PT_TZ   = 5;       // MVT = UTC+5

// Calculation method selector kept for UI compatibility; method label is shown
// in the info bar but times always come from the Namaadhu database.
const PT_METHODS = {
  Namaadhu: { name: "Namaadhu App (Addu Atoll pre-computed)", fajr: null, isha: null },
};

let _ptDate    = new Date();
let _ptMethod  = "Namaadhu";
let _ptTimer   = null;
let _ptInited  = false;

// ── Namaadhu pre-computed lookup table ──────────────────────────────────────
// 366 entries: index 0 = Jan 1 … index 58 = Feb 28, index 59 = Feb 29,
//              index 60 = Mar 1 … index 365 = Dec 31.
// Each entry: "HHMM,HHMM,HHMM,HHMM,HHMM,HHMM"
//             fajr, sunrise, dhuhr, asr, maghrib, isha  (all MVT)
// Source: prayertimesdb.bin shipped with Namaadhu v1.3.02 — island number=82
//         (Hithadhoo / Addu Atoll), adj_min=0.
const PT_DB = [
  "0448,0605,1215,1538,1818,1936",
  "0448,0605,1216,1538,1818,1936",
  "0449,0606,1216,1539,1819,1936",
  "0449,0606,1217,1539,1819,1937",
  "0450,0606,1217,1540,1820,1937",
  "0450,0607,1218,1540,1820,1938",
  "0451,0607,1218,1541,1821,1938",
  "0451,0608,1219,1541,1821,1938",
  "0452,0608,1219,1541,1821,1939",
  "0452,0609,1219,1542,1822,1939",
  "0453,0609,1220,1542,1822,1939",
  "0453,0609,1220,1542,1822,1939",
  "0454,0610,1221,1542,1823,1940",
  "0454,0610,1221,1543,1823,1940",
  "0455,0611,1221,1543,1823,1940",
  "0455,0611,1222,1543,1824,1940",
  "0456,0611,1222,1543,1824,1941",
  "0456,0612,1222,1544,1824,1941",
  "0456,0612,1223,1544,1825,1941",
  "0457,0612,1223,1544,1825,1941",
  "0457,0613,1223,1544,1825,1941",
  "0458,0613,1224,1544,1825,1941",
  "0458,0613,1224,1544,1826,1942",
  "0458,0613,1224,1544,1826,1942",
  "0459,0614,1224,1544,1826,1942",
  "0459,0614,1224,1545,1826,1942",
  "0500,0614,1225,1545,1827,1942",
  "0500,0614,1225,1545,1827,1942",
  "0500,0615,1225,1545,1827,1942",
  "0501,0615,1225,1545,1827,1942",
  "0501,0615,1225,1545,1827,1942",
  "0501,0615,1226,1544,1827,1942",
  "0501,0615,1226,1544,1827,1942",
  "0502,0615,1226,1544,1828,1942",
  "0502,0615,1226,1544,1828,1942",
  "0502,0615,1226,1544,1828,1942",
  "0502,0615,1226,1543,1828,1942",
  "0502,0616,1226,1543,1828,1942",
  "0503,0616,1226,1543,1828,1942",
  "0503,0616,1226,1543,1828,1941",
  "0503,0616,1226,1542,1828,1941",
  "0503,0616,1226,1542,1828,1941",
  "0503,0616,1226,1542,1828,1941",
  "0503,0616,1226,1541,1828,1941",
  "0503,0616,1226,1541,1828,1941",
  "0503,0616,1226,1541,1828,1941",
  "0504,0616,1226,1540,1828,1940",
  "0504,0616,1226,1540,1828,1940",
  "0504,0616,1226,1539,1827,1940",
  "0504,0616,1226,1539,1827,1940",
  "0504,0616,1226,1538,1827,1940",
  "0504,0615,1226,1538,1827,1939",
  "0504,0615,1226,1537,1827,1939",
  "0504,0615,1226,1537,1827,1939",
  "0504,0615,1225,1536,1827,1939",
  "0504,0615,1225,1536,1826,1938",
  "0504,0615,1225,1535,1826,1938",
  "0504,0615,1225,1534,1826,1938",
  "0504,0615,1225,1534,1826,1938",
  "0504,0615,1225,1533,1826,1937",
  "0504,0614,1225,1533,1826,1937",
  "0504,0614,1224,1532,1826,1937",
  "0503,0614,1224,1531,1825,1937",
  "0503,0614,1224,1531,1825,1936",
  "0503,0614,1224,1530,1825,1936",
  "0503,0613,1223,1529,1825,1936",
  "0503,0613,1223,1528,1824,1936",
  "0503,0613,1223,1527,1824,1935",
  "0502,0613,1223,1526,1824,1935",
  "0502,0613,1222,1525,1824,1935",
  "0502,0612,1222,1525,1823,1934",
  "0502,0612,1222,1524,1823,1934",
  "0501,0612,1222,1523,1823,1934",
  "0501,0612,1221,1522,1823,1933",
  "0501,0611,1221,1521,1822,1933",
  "0501,0611,1221,1520,1822,1933",
  "0501,0611,1221,1519,1822,1932",
  "0500,0610,1220,1518,1821,1932",
  "0500,0610,1220,1517,1821,1932",
  "0500,0610,1220,1517,1821,1931",
  "0500,0610,1219,1518,1820,1931",
  "0459,0609,1219,1518,1820,1931",
  "0459,0609,1219,1519,1820,1931",
  "0459,0609,1218,1519,1819,1930",
  "0458,0608,1218,1519,1819,1930",
  "0458,0608,1218,1520,1819,1930",
  "0458,0608,1218,1520,1818,1929",
  "0457,0608,1217,1520,1818,1929",
  "0457,0607,1217,1521,1818,1929",
  "0457,0607,1217,1521,1817,1928",
  "0456,0607,1216,1521,1817,1928",
  "0456,0606,1216,1522,1817,1928",
  "0456,0606,1216,1522,1816,1928",
  "0455,0606,1215,1522,1816,1927",
  "0455,0605,1215,1522,1816,1927",
  "0455,0605,1215,1523,1816,1927",
  "0454,0605,1215,1523,1815,1927",
  "0454,0605,1214,1523,1815,1926",
  "0454,0604,1214,1523,1815,1926",
  "0453,0604,1214,1523,1814,1926",
  "0453,0604,1213,1524,1814,1926",
  "0453,0604,1213,1524,1814,1925",
  "0452,0603,1213,1524,1813,1925",
  "0452,0603,1213,1524,1813,1925",
  "0452,0603,1212,1524,1813,1925",
  "0451,0603,1212,1524,1813,1925",
  "0451,0602,1212,1525,1812,1925",
  "0451,0602,1212,1525,1812,1924",
  "0451,0602,1211,1525,1812,1924",
  "0450,0602,1211,1525,1812,1924",
  "0450,0601,1211,1525,1811,1924",
  "0450,0601,1211,1525,1811,1924",
  "0449,0601,1211,1525,1811,1924",
  "0449,0601,1210,1526,1811,1924",
  "0449,0601,1210,1526,1811,1924",
  "0449,0600,1210,1526,1810,1923",
  "0448,0600,1210,1526,1810,1923",
  "0448,0600,1210,1526,1810,1923",
  "0448,0600,1210,1526,1810,1923",
  "0448,0600,1209,1526,1810,1923",
  "0447,0600,1209,1526,1809,1923",
  "0447,0600,1209,1527,1809,1923",
  "0447,0600,1209,1527,1809,1923",
  "0447,0600,1209,1527,1809,1923",
  "0447,0559,1209,1527,1809,1923",
  "0446,0559,1209,1527,1809,1923",
  "0446,0559,1209,1527,1809,1923",
  "0446,0559,1209,1527,1809,1923",
  "0446,0559,1208,1527,1809,1923",
  "0446,0559,1208,1527,1809,1923",
  "0445,0559,1208,1528,1809,1923",
  "0445,0559,1208,1528,1809,1923",
  "0445,0559,1208,1528,1809,1923",
  "0445,0559,1208,1528,1809,1923",
  "0445,0559,1208,1528,1809,1924",
  "0445,0559,1208,1528,1809,1924",
  "0445,0559,1208,1528,1809,1924",
  "0445,0559,1208,1528,1809,1924",
  "0445,0559,1208,1529,1809,1924",
  "0445,0559,1208,1529,1809,1924",
  "0445,0559,1208,1529,1809,1924",
  "0444,0559,1208,1529,1809,1924",
  "0444,0559,1209,1529,1809,1925",
  "0444,0559,1209,1529,1809,1925",
  "0444,0559,1209,1530,1809,1925",
  "0444,0559,1209,1530,1809,1925",
  "0444,0600,1209,1530,1809,1925",
  "0444,0600,1209,1530,1809,1926",
  "0444,0600,1209,1530,1809,1926",
  "0445,0600,1209,1531,1810,1926",
  "0445,0600,1209,1531,1810,1926",
  "0445,0600,1210,1531,1810,1927",
  "0445,0600,1210,1531,1810,1927",
  "0445,0601,1210,1531,1810,1927",
  "0445,0601,1210,1532,1810,1927",
  "0445,0601,1210,1532,1810,1927",
  "0445,0601,1210,1532,1810,1928",
  "0445,0601,1210,1532,1811,1928",
  "0445,0602,1211,1532,1811,1928",
  "0446,0602,1211,1533,1811,1928",
  "0446,0602,1211,1533,1811,1929",
  "0446,0602,1211,1533,1811,1929",
  "0446,0602,1211,1533,1812,1929",
  "0446,0603,1212,1534,1812,1929",
  "0446,0603,1212,1534,1812,1930",
  "0446,0603,1212,1534,1812,1930",
  "0447,0603,1212,1534,1812,1930",
  "0447,0603,1213,1534,1813,1930",
  "0447,0604,1213,1535,1813,1931",
  "0447,0604,1213,1535,1813,1931",
  "0447,0604,1213,1535,1813,1931",
  "0448,0604,1213,1535,1814,1931",
  "0448,0605,1214,1536,1814,1931",
  "0448,0605,1214,1536,1814,1932",
  "0448,0605,1214,1536,1814,1932",
  "0448,0605,1214,1536,1814,1932",
  "0449,0605,1214,1536,1815,1932",
  "0449,0606,1215,1537,1815,1932",
  "0449,0606,1215,1537,1815,1933",
  "0449,0606,1215,1537,1815,1933",
  "0450,0606,1215,1537,1815,1933",
  "0450,0606,1215,1537,1816,1933",
  "0450,0606,1216,1538,1816,1933",
  "0450,0607,1216,1538,1816,1934",
  "0450,0607,1216,1538,1816,1934",
  "0451,0607,1216,1538,1816,1934",
  "0451,0607,1216,1538,1817,1934",
  "0451,0607,1217,1538,1817,1934",
  "0451,0607,1217,1538,1817,1934",
  "0451,0608,1217,1539,1817,1934",
  "0452,0608,1217,1539,1817,1934",
  "0452,0608,1217,1539,1817,1934",
  "0452,0608,1217,1539,1818,1934",
  "0452,0608,1217,1539,1818,1934",
  "0453,0608,1218,1539,1818,1935",
  "0453,0608,1218,1539,1818,1935",
  "0453,0608,1218,1539,1818,1935",
  "0453,0609,1218,1539,1818,1935",
  "0453,0609,1218,1539,1818,1935",
  "0454,0609,1218,1539,1818,1935",
  "0454,0609,1218,1539,1818,1935",
  "0454,0609,1218,1539,1818,1935",
  "0454,0609,1218,1539,1819,1935",
  "0454,0609,1218,1539,1819,1934",
  "0454,0609,1218,1539,1819,1934",
  "0454,0609,1218,1539,1819,1934",
  "0455,0609,1218,1539,1819,1934",
  "0455,0609,1218,1539,1819,1934",
  "0455,0609,1218,1539,1819,1934",
  "0455,0609,1218,1538,1819,1934",
  "0455,0609,1218,1538,1819,1934",
  "0455,0609,1218,1538,1819,1934",
  "0455,0609,1218,1538,1819,1933",
  "0455,0609,1218,1538,1819,1933",
  "0455,0609,1218,1537,1819,1933",
  "0455,0609,1218,1537,1818,1933",
  "0455,0609,1218,1537,1818,1933",
  "0455,0609,1218,1537,1818,1932",
  "0455,0609,1218,1536,1818,1932",
  "0455,0608,1218,1536,1818,1932",
  "0455,0608,1218,1536,1818,1932",
  "0455,0608,1217,1535,1818,1932",
  "0455,0608,1217,1535,1818,1931",
  "0455,0608,1217,1535,1818,1931",
  "0455,0608,1217,1534,1817,1931",
  "0455,0608,1217,1534,1817,1931",
  "0455,0607,1217,1534,1817,1930",
  "0455,0607,1216,1533,1817,1930",
  "0455,0607,1216,1533,1817,1930",
  "0455,0607,1216,1532,1816,1929",
  "0455,0607,1216,1532,1816,1929",
  "0455,0606,1216,1531,1816,1929",
  "0454,0606,1215,1531,1816,1929",
  "0454,0606,1215,1530,1816,1928",
  "0454,0606,1215,1530,1815,1928",
  "0454,0605,1215,1529,1815,1928",
  "0454,0605,1214,1528,1815,1927",
  "0454,0605,1214,1528,1815,1927",
  "0453,0605,1214,1527,1814,1927",
  "0453,0604,1214,1526,1814,1926",
  "0453,0604,1213,1526,1814,1926",
  "0453,0604,1213,1525,1814,1926",
  "0452,0603,1213,1524,1813,1925",
  "0452,0603,1212,1524,1813,1925",
  "0452,0603,1212,1523,1813,1925",
  "0452,0602,1212,1522,1813,1924",
  "0451,0602,1212,1521,1812,1924",
  "0451,0602,1211,1521,1812,1923",
  "0451,0601,1211,1520,1812,1923",
  "0451,0601,1211,1519,1811,1923",
  "0450,0601,1210,1518,1811,1922",
  "0450,0600,1210,1517,1811,1922",
  "0450,0600,1210,1516,1810,1922",
  "0449,0600,1209,1516,1810,1921",
  "0449,0559,1209,1515,1810,1921",
  "0449,0559,1208,1514,1809,1920",
  "0448,0559,1208,1513,1809,1920",
  "0448,0558,1208,1512,1809,1920",
  "0448,0558,1207,1511,1808,1919",
  "0447,0557,1207,1510,1808,1919",
  "0447,0557,1207,1509,1808,1919",
  "0447,0557,1206,1508,1807,1918",
  "0446,0556,1206,1507,1807,1918",
  "0446,0556,1206,1506,1807,1917",
  "0445,0556,1205,1505,1806,1917",
  "0445,0555,1205,1504,1806,1917",
  "0445,0555,1205,1503,1805,1916",
  "0444,0555,1204,1502,1805,1916",
  "0444,0554,1204,1502,1805,1916",
  "0444,0554,1204,1503,1804,1915",
  "0443,0553,1203,1503,1804,1915",
  "0443,0553,1203,1503,1804,1915",
  "0443,0553,1203,1504,1803,1914",
  "0442,0552,1202,1504,1803,1914",
  "0442,0552,1202,1504,1803,1914",
  "0442,0552,1202,1504,1802,1914",
  "0441,0551,1201,1505,1802,1913",
  "0441,0551,1201,1505,1802,1913",
  "0440,0551,1201,1505,1802,1913",
  "0440,0550,1200,1505,1801,1913",
  "0440,0550,1200,1506,1801,1912",
  "0439,0550,1200,1506,1801,1912",
  "0439,0549,1159,1506,1801,1912",
  "0439,0549,1159,1507,1800,1912",
  "0438,0549,1159,1507,1800,1912",
  "0438,0548,1159,1507,1800,1911",
  "0438,0548,1158,1507,1800,1911",
  "0437,0548,1158,1508,1759,1911",
  "0437,0548,1158,1508,1759,1911",
  "0437,0547,1158,1508,1759,1911",
  "0436,0547,1158,1508,1759,1911",
  "0436,0547,1157,1509,1759,1911",
  "0436,0547,1157,1509,1758,1910",
  "0435,0547,1157,1509,1758,1910",
  "0435,0546,1157,1509,1758,1910",
  "0435,0546,1157,1510,1758,1910",
  "0435,0546,1156,1510,1758,1910",
  "0434,0546,1156,1510,1758,1910",
  "0434,0546,1156,1510,1758,1910",
  "0434,0546,1156,1511,1758,1910",
  "0434,0545,1156,1511,1757,1910",
  "0433,0545,1156,1511,1757,1910",
  "0433,0545,1156,1511,1757,1910",
  "0433,0545,1156,1512,1757,1911",
  "0433,0545,1156,1512,1757,1911",
  "0433,0545,1156,1512,1757,1911",
  "0432,0545,1156,1512,1757,1911",
  "0432,0545,1156,1513,1757,1911",
  "0432,0545,1156,1513,1757,1911",
  "0432,0545,1156,1513,1757,1911",
  "0432,0545,1156,1513,1757,1911",
  "0432,0545,1156,1514,1757,1912",
  "0432,0545,1156,1514,1758,1912",
  "0432,0545,1156,1514,1758,1912",
  "0432,0545,1156,1515,1758,1912",
  "0432,0545,1156,1515,1758,1913",
  "0432,0545,1156,1515,1758,1913",
  "0432,0545,1156,1516,1758,1913",
  "0432,0546,1156,1516,1758,1913",
  "0432,0546,1157,1516,1759,1914",
  "0432,0546,1157,1517,1759,1914",
  "0432,0546,1157,1517,1759,1914",
  "0432,0546,1157,1517,1759,1915",
  "0432,0546,1157,1518,1759,1915",
  "0432,0546,1158,1518,1800,1915",
  "0432,0547,1158,1518,1800,1916",
  "0432,0547,1158,1519,1800,1916",
  "0432,0547,1158,1519,1800,1916",
  "0432,0547,1159,1520,1801,1917",
  "0432,0548,1159,1520,1801,1917",
  "0433,0548,1159,1520,1801,1918",
  "0433,0548,1159,1521,1802,1918",
  "0433,0549,1200,1521,1802,1919",
  "0433,0549,1200,1522,1802,1919",
  "0434,0549,1200,1522,1803,1920",
  "0434,0550,1201,1523,1803,1920",
  "0434,0550,1201,1523,1804,1921",
  "0434,0550,1202,1524,1804,1921",
  "0435,0551,1202,1524,1804,1922",
  "0435,0551,1202,1525,1805,1922",
  "0435,0552,1203,1525,1805,1923",
  "0436,0552,1203,1525,1806,1923",
  "0436,0553,1204,1526,1806,1924",
  "0436,0553,1204,1526,1807,1924",
  "0437,0554,1205,1527,1807,1925",
  "0437,0554,1205,1527,1808,1925",
  "0438,0555,1206,1528,1808,1926",
  "0438,0555,1206,1528,1809,1926",
  "0439,0556,1207,1529,1809,1927",
  "0439,0556,1207,1529,1809,1927",
  "0440,0557,1207,1530,1810,1928",
  "0440,0557,1208,1530,1810,1928",
  "0441,0558,1208,1531,1811,1929",
  "0441,0558,1209,1531,1811,1929",
  "0442,0559,1209,1532,1812,1930",
  "0442,0559,1210,1532,1812,1930",
  "0443,0600,1210,1533,1813,1931",
  "0443,0600,1211,1533,1813,1931",
  "0444,0601,1211,1534,1814,1932",
  "0444,0601,1212,1534,1814,1932",
  "0445,0602,1212,1535,1815,1933",
  "0445,0602,1213,1535,1815,1933",
  "0446,0603,1213,1536,1816,1934",
  "0446,0603,1214,1536,1816,1934",
  "0447,0604,1214,1537,1817,1935",
  "0447,0604,1215,1537,1817,1935"
];

/**
 * Return the 0-based day-of-year index used by PT_DB for a given Date.
 * Mirrors r.a.l(): the DB is keyed to 1972 (a leap year), so Feb 29 always
 * exists at index 59 and every subsequent day is one slot further along.
 * For non-leap years we never request index 59 — the caller skips it.
 */
function _ptDayIndex(date) {
  const month = date.getMonth() + 1; // 1-based
  const day   = date.getDate();
  // Cumulative days before each month in a leap year (1972)
  const cumDays = [0,31,60,91,121,152,182,213,244,274,305,335];
  return cumDays[month - 1] + day - 1;
}

/**
 * Parse a "HHMM" string into a decimal hour (e.g. "0446" → 4.767).
 */
function _ptParseHHMM(s) {
  const hh = parseInt(s.slice(0, 2), 10);
  const mm = parseInt(s.slice(2, 4), 10);
  return hh + mm / 60;
}

/**
 * Look up prayer times from the Namaadhu database for a given local Date.
 * Returns the same shape as the old computePrayerTimes():
 *   { fajr, sunrise, dhuhr, asr, maghrib, isha }  (decimal hours, MVT)
 */
function computePrayerTimes(date /*, methodKey — ignored, kept for compat */) {
  const idx = _ptDayIndex(date);
  const row = PT_DB[idx];
  if (!row) return null;
  const parts = row.split(",");
  return {
    fajr:    _ptParseHHMM(parts[0]),
    sunrise: _ptParseHHMM(parts[1]),
    dhuhr:   _ptParseHHMM(parts[2]),
    asr:     _ptParseHHMM(parts[3]),
    maghrib: _ptParseHHMM(parts[4]),
    isha:    _ptParseHHMM(parts[5]),
  };
}

/* ── Helper: degrees ↔ radians (kept for Qibla calculation) ── */
function _rad(deg) { return deg * Math.PI / 180; }
function _deg(rad) { return rad * 180 / Math.PI; }

/* ── Hijri date (simple arithmetic conversion) ── */
/* ── Format helpers for UI ── */
function ptFmt12(h) {
  if (h === null) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2,"0")} ${ampm}`;
}

function ptFmt24(h) {
  if (h === null) return "—";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
}

/* ── Julian Day Number (UTC) — used by toHijri ── */
function _jdn(date) {
  const y = date.getUTCFullYear(), m = date.getUTCMonth() + 1, d = date.getUTCDate();
  const h = date.getUTCHours(), mn = date.getUTCMinutes(), s = date.getUTCSeconds();
  const dayFrac = (h + mn/60 + s/3600) / 24;
  let A = Math.floor((14 - m) / 12), Y = y + 4800 - A, M = m + 12*A - 3;
  let JD = d + Math.floor((153*M+2)/5) + 365*Y + Math.floor(Y/4) - Math.floor(Y/100) + Math.floor(Y/400) - 32045;
  return JD + dayFrac - 0.5;
}

function toHijri(date) {
  const jd = Math.floor(_jdn(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))) + 0.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
          + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
           - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l3) / 709);
  const d = l3 - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;
  const months = ["Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani","Jumada al-Ula","Jumada al-Akhirah","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"];
  return `${d} ${months[m - 1] || ""} ${y} AH`;
}

/* ── Qibla direction from Addu City ── */
function qiblaDirection() {
  // Makkah: 21.4225°N, 39.8262°E
  const mLat = _rad(21.4225), mLng = _rad(39.8262);
  const lat   = _rad(PT_LAT),  lng  = _rad(PT_LNG);
  const dLng  = mLng - lng;
  const y = Math.sin(dLng) * Math.cos(mLat);
  const x = Math.cos(lat) * Math.sin(mLat) - Math.sin(lat) * Math.cos(mLat) * Math.cos(dLng);
  let deg = (_deg(Math.atan2(y, x)) + 360) % 360;
  return deg;
}

/* ── Prayer metadata ── */
const PT_PRAYERS = [
  { key: "fajr",    label: "Fajr",    arabic: "الفجر",   icon: "🌙", desc: "Pre-dawn prayer" },
  { key: "sunrise", label: "Sunrise", arabic: "الشروق",  icon: "🌅", desc: "Sun rises" },
  { key: "dhuhr",   label: "Dhuhr",   arabic: "الظهر",   icon: "☀️", desc: "Midday prayer" },
  { key: "asr",     label: "Asr",     arabic: "العصر",   icon: "🌤️", desc: "Afternoon prayer" },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب",  icon: "🌇", desc: "Sunset prayer" },
  { key: "isha",    label: "Isha",    arabic: "العشاء",  icon: "🌃", desc: "Night prayer" },
];

/* ── Render the prayers grid ── */
function ptRenderGrid(times, nowH) {
  const grid = document.getElementById("pt-prayers-grid");
  if (!grid) return;

  // Determine current/next prayer (only fajr, dhuhr, asr, maghrib, isha)
  const prayerKeys = ["fajr","dhuhr","asr","maghrib","isha"];
  let nextKey = null, prevKey = null;
  for (let i = 0; i < prayerKeys.length; i++) {
    const h = times[prayerKeys[i]];
    if (h !== null && nowH < h) { nextKey = prayerKeys[i]; if (i > 0) prevKey = prayerKeys[i-1]; break; }
    if (h !== null) prevKey = prayerKeys[i];
  }
  if (!nextKey) nextKey = "fajr"; // wrap to next day

  grid.innerHTML = PT_PRAYERS.map(p => {
    const h = times[p.key];
    const isCurrent = p.key === prevKey;
    const isNext    = p.key === nextKey;
    const isSunrise = p.key === "sunrise";
    return `<div class="pt-prayer-card ${isCurrent ? "pt-prayer-current" : ""} ${isNext ? "pt-prayer-next" : ""} ${isSunrise ? "pt-prayer-sunrise" : ""}">
      <div class="pt-prayer-icon">${p.icon}</div>
      <div class="pt-prayer-arabic">${p.arabic}</div>
      <div class="pt-prayer-name">${p.label}</div>
      <div class="pt-prayer-time">${ptFmt12(h)}</div>
      <div class="pt-prayer-time-24">${ptFmt24(h)}</div>
      <div class="pt-prayer-desc">${p.desc}</div>
      ${isCurrent ? '<div class="pt-prayer-badge pt-badge-current">Current</div>' : ""}
      ${isNext    ? '<div class="pt-prayer-badge pt-badge-next">Next</div>' : ""}
    </div>`;
  }).join("");
}

/* ── Render next-prayer countdown card ── */
function ptRenderNextCard(times, now) {
  const prayerKeys = ["fajr","dhuhr","asr","maghrib","isha"];
  const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
  let nextKey = null, nextH = null;
  for (const k of prayerKeys) {
    const h = times[k];
    if (h !== null && nowH < h) { nextKey = k; nextH = h; break; }
  }

  const nameEl      = document.getElementById("pt-next-name");
  const iconEl      = document.getElementById("pt-next-icon");
  const arabicEl    = document.getElementById("pt-next-arabic");
  const descEl      = document.getElementById("pt-next-desc");
  const timeEl      = document.getElementById("pt-next-time");
  const cdEl        = document.getElementById("pt-next-countdown");
  const barEl       = document.getElementById("pt-next-progress-bar");
  const prevLblEl   = document.getElementById("pt-next-prev-label");
  const nextLblEl   = document.getElementById("pt-next-next-label");
  const ringFillEl  = document.getElementById("pt-next-ring-fill");
  const hijriEl     = document.getElementById("pt-next-hijri");
  if (!nameEl) return;

  if (!nextKey) {
    if (iconEl)    iconEl.textContent   = "🌙";
    nameEl.textContent                  = "All done";
    if (arabicEl)  arabicEl.textContent = "";
    if (descEl)    descEl.textContent   = "All prayers completed for today";
    if (timeEl)    timeEl.textContent   = "Fajr";
    if (cdEl)      cdEl.textContent     = "Tomorrow";
    if (prevLblEl) prevLblEl.textContent = "🌃 Isha";
    if (nextLblEl) nextLblEl.textContent = "🌄 Fajr";
    if (barEl)     barEl.style.width    = "100%";
    if (ringFillEl) {
      const circ = 2 * Math.PI * 40;
      ringFillEl.style.strokeDasharray  = circ;
      ringFillEl.style.strokeDashoffset = "0";
    }
    return;
  }

  const meta = PT_PRAYERS.find(p => p.key === nextKey);
  if (iconEl)    iconEl.textContent   = meta.icon;
  nameEl.textContent                  = meta.label;
  if (arabicEl)  arabicEl.textContent = meta.arabic;
  if (descEl)    descEl.textContent   = meta.desc;
  if (timeEl)    timeEl.textContent   = ptFmt12(nextH);

  // Countdown
  const secsRemaining = Math.round((nextH - nowH) * 3600);
  const hh = Math.floor(secsRemaining / 3600);
  const mm = Math.floor((secsRemaining % 3600) / 60);
  const ss = secsRemaining % 60;
  if (cdEl) cdEl.textContent = secsRemaining > 0
    ? `${hh > 0 ? hh+"h " : ""}${mm}m ${String(ss).padStart(2,"0")}s`
    : "Now";

  // Progress between prev prayer and next
  const idx = prayerKeys.indexOf(nextKey);
  const prevH = idx > 0 ? (times[prayerKeys[idx-1]] || 0) : 0;
  const span  = nextH - prevH;
  const elapsed = nowH - prevH;
  const pct = span > 0 ? Math.min(100, Math.max(0, (elapsed / span) * 100)) : 0;
  if (barEl) barEl.style.width = pct + "%";

  // Progress bar end labels
  if (prevLblEl) {
    const prevMeta = idx > 0 ? PT_PRAYERS.find(p => p.key === prayerKeys[idx-1]) : null;
    prevLblEl.textContent = prevMeta ? `${prevMeta.icon} ${prevMeta.label}` : "Start of day";
  }
  if (nextLblEl) nextLblEl.textContent = `${meta.icon} ${meta.label}`;

  // SVG ring — r=40, circumference = 2π×40 ≈ 251.3
  if (ringFillEl) {
    const circ = 2 * Math.PI * 40;
    ringFillEl.style.strokeDasharray  = circ;
    ringFillEl.style.strokeDashoffset = circ * (1 - pct / 100);
  }

  // Hijri date
  if (hijriEl) hijriEl.textContent = toHijri(_ptDate);
}

/* ── Sun info rows ── */
function ptRenderSunInfo(times) {
  const el = document.getElementById("pt-sun-rows");
  if (!el) return;
  el.innerHTML = `
    <div class="pt-sun-row"><span>Sunrise</span><span>${ptFmt12(times.sunrise)}</span></div>
    <div class="pt-sun-row"><span>Solar Noon</span><span>${ptFmt12(times.dhuhr)}</span></div>
    <div class="pt-sun-row"><span>Sunset</span><span>${ptFmt12(times.maghrib)}</span></div>
    <div class="pt-sun-row"><span>Day length</span><span>${times.sunrise !== null && times.maghrib !== null
      ? (() => { const dl = times.maghrib - times.sunrise; return `${Math.floor(dl)}h ${Math.round((dl%1)*60)}m`; })()
      : "—"}</span></div>
  `;
}

/* ── Qibla compass ── */
function ptRenderQibla() {
  const deg = qiblaDirection();
  const degEl = document.getElementById("pt-qibla-deg");
  const needle = document.getElementById("pt-compass-needle");
  if (degEl) {
    // Compute cardinal/intercardinal label from bearing
    const cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    const label = cardinals[Math.round(deg / 22.5) % 16];
    degEl.textContent = `${deg.toFixed(1)}° ${label}`;
  }
  if (needle) needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
}

/* ── Full page refresh ── */
function ptRefresh() {
  const times = computePrayerTimes(_ptDate, _ptMethod);
  if (!times) {
    console.warn("Prayer times could not be computed for this date/location.");
    return;
  }
  const now   = new Date();
  const nowH  = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;

  // Date display
  const displayDateEl = document.getElementById("pt-display-date");
  if (displayDateEl) {
    displayDateEl.textContent = _ptDate.toLocaleDateString("en-US",
      { weekday:"short", year:"numeric", month:"short", day:"numeric" });
  }

  const hijriEl = document.getElementById("pt-hijri-date");
  if (hijriEl) hijriEl.textContent = toHijri(_ptDate);

  ptRenderGrid(times, nowH);
  ptRenderNextCard(times, now);
  ptRenderSunInfo(times);
  ptRenderQibla();

  // Method info
  const infoEl = document.getElementById("pt-method-info");
  if (infoEl) {
    infoEl.textContent = `📍 Location: ${PT_LAT}°N, ${PT_LNG}°E | Timezone: MVT (UTC+${PT_TZ})`;
  }
}

/* ── Main init ── */
function initPrayerTimes() {
  // Reset date to today on every tab open
  _ptDate = new Date();
  _ptDate.setHours(0,0,0,0);

  if (!_ptInited) {
    _ptInited = true;

    document.getElementById("pt-prev-day")?.addEventListener("click", () => {
      _ptDate.setDate(_ptDate.getDate() - 1);
      ptRefresh();
    });
    document.getElementById("pt-next-day")?.addEventListener("click", () => {
      _ptDate.setDate(_ptDate.getDate() + 1);
      ptRefresh();
    });
    document.getElementById("pt-today-btn")?.addEventListener("click", () => {
      _ptDate = new Date(); _ptDate.setHours(0,0,0,0);
      ptRefresh();
    });
    document.getElementById("pt-method")?.addEventListener("change", e => {
      _ptMethod = e.target.value;
      ptRefresh();
    });
  }

  ptRefresh();

  // Live countdown tick every second
  if (_ptTimer) clearInterval(_ptTimer);
  let _ptLastDay = new Date().getDate();
  _ptTimer = setInterval(() => {
    const now = new Date();
    // Handle midnight rollover — reset to new day and do a full refresh
    if (now.getDate() !== _ptLastDay) {
      _ptLastDay = now.getDate();
      _ptDate = new Date(); _ptDate.setHours(0,0,0,0);
      ptRefresh();
      return;
    }
    const times = computePrayerTimes(_ptDate, _ptMethod);
    if (!times) return;
    const nowH = now.getHours() + now.getMinutes()/60 + now.getSeconds()/3600;
    ptRenderGrid(times, nowH);
    ptRenderNextCard(times, now);
  }, 1000);
}