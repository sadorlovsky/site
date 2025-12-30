export const cityNamesRu: Record<string, string> = {
  // Spain
  Barcelona: "Барселона",
  Madrid: "Мадрид",
  Toledo: "Толедо",
  Bilbao: "Бильбао",

  // France
  Paris: "Париж",
  "Saint-Louis": "Сен-Луи",
  Huningue: "Юненг",

  // Germany
  "Weil am Rhein": "Вайль-ам-Райн",
  Berlin: "Берлин",

  // Switzerland
  Basel: "Базель",

  // UK
  London: "Лондон",
  Bath: "Бат",
  York: "Йорк",
  Liverpool: "Ливерпуль",
  Edinburgh: "Эдинбург",

  // Uzbekistan
  Tashkent: "Ташкент",

  // Turkey
  Istanbul: "Стамбул",

  // UAE
  "Abu Dhabi": "Абу-Даби",

  // Kazakhstan
  Aktau: "Актау",
  Almaty: "Алматы",
  Astana: "Астана",

  // Portugal
  Lisbon: "Лиссабон",
  Sintra: "Синтра",
  "Costa da Caparica": "Кошта-да-Капарика",
  Almada: "Алмада",

  // Austria
  Vienna: "Вена",
  Hallstatt: "Гальштат",

  // Slovakia
  Bratislava: "Братислава",

  // Italy
  Bergamo: "Бергамо",
  Milan: "Милан",
  Venice: "Венеция",
  Florence: "Флоренция",
  Pisa: "Пиза",
  "La Spezia": "Ла-Специя",
  Manarola: "Манарола",
  Riomaggiore: "Риомаджоре",
  Rome: "Рим",
  Naples: "Неаполь",

  // Vatican
  "Vatican City": "Ватикан",

  // Russia
  "Saint Petersburg": "Санкт-Петербург",
  Yaroslavl: "Ярославль",
  Rostov: "Ростов",
  Rybinsk: "Рыбинск",
  Anapa: "Анапа",
  Vyborg: "Выборг",
  Kaliningrad: "Калининград",
  Svetlogorsk: "Светлогорск",
  Zelenogradsk: "Зеленоградск",
  Sochi: "Сочи",
  Krasnodar: "Краснодар",
  Kazan: "Казань",
  Vladimir: "Владимир",
  Murmansk: "Мурманск",

  // Moldova
  Chișinău: "Кишинёв",

  // Hungary
  Budapest: "Будапешт",

  // Belarus
  Minsk: "Минск",

  // Latvia
  Riga: "Рига",
  Jūrmala: "Юрмала",

  // Sweden
  Stockholm: "Стокгольм",

  // Poland
  Warsaw: "Варшава",

  // Finland
  Helsinki: "Хельсинки",

  // Estonia
  Tallinn: "Таллин",

  // Lithuania
  Vilnius: "Вильнюс",

  // Netherlands
  Amsterdam: "Амстердам",

  // Belgium
  Brussels: "Брюссель",
  Bruges: "Брюгге",
  Antwerp: "Антверпен",

  // Czechia
  Prague: "Прага",
};

export function getCityName(city: string, lang: "en" | "ru"): string {
  if (lang === "ru") {
    return cityNamesRu[city] || city;
  }
  return city;
}
