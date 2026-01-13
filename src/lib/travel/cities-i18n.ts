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
  Samarkand: "Самарканд",
  Bukhara: "Бухара",
  Fergana: "Фергана",

  // Turkey
  Istanbul: "Стамбул",

  // UAE
  "Abu Dhabi": "Абу-Даби",
  Dubai: "Дубай",

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
  Malmö: "Мальмё",
  Göteborg: "Гётеборг",

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

  // Japan
  Tokyo: "Токио",
  Kyoto: "Киото",
  Osaka: "Осака",
  Hiroshima: "Хиросима",
  Itsukushima: "Ицукусима",
  Sapporo: "Саппоро",

  // Kyrgyzstan
  Bishkek: "Бишкек",

  // Tajikistan
  Dushanbe: "Душанбе",

  // Svalbard
  Longyearbyen: "Лонгйир",
  Pyramiden: "Пирамида",
  "Ny-Ålesund": "Ню-Олесунн",

  // Egypt
  Cairo: "Каир",
  Giza: "Гиза",
  Alexandria: "Александрия",
  "El Gouna": "Эль-Гуна",

  // Morocco
  Casablanca: "Касабланка",
  Marrakech: "Марракеш",
  Rabat: "Рабат",
  Fez: "Фес",
  Zaida: "Заида",
  Tangier: "Танжер",

  // Denmark
  Copenhagen: "Копенгаген",

  // Norway
  Oslo: "Осло",

  // Iceland
  Reykjavik: "Рейкьявик",

  // Serbia
  Belgrade: "Белград",
  "Novi Sad": "Нови-Сад",

  // Bosnia and Herzegovina
  Sarajevo: "Сараево",

  // Montenegro
  Podgorica: "Подгорица",
  Budva: "Будва",
  Bar: "Бар",

  // Albania
  Tiranë: "Тирана",

  // Malaysia
  "Kuala Lumpur": "Куала-Лумпур",

  // Hong Kong
  "Hong Kong": "Гонконг",

  // Macau
  Macau: "Макао",

  // Taiwan
  Taipei: "Тайбэй",

  // South Korea
  Seoul: "Сеул",

  // India
  Delhi: "Дели",
  Jaipur: "Джайпур",
  Agra: "Агра",
  Mumbai: "Мумбаи",
  Bengaluru: "Бангалор",
  Goa: "Гоа",

  // Sri Lanka
  Colombo: "Коломбо",

  // China
  Beijing: "Пекин",
};

export function getCityName(city: string, lang: "en" | "ru"): string {
  if (lang === "ru") {
    return cityNamesRu[city] || city;
  }
  return city;
}
