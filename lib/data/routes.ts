export interface Station {
  name: string;
  km: number;
}

export interface Route {
  id: string;
  name: string;
  stations: Station[];
}

export const TOKAIDO: Route = {
  id: 'tokaido',
  name: '東海道新幹線',
  stations: [
    { name: '東京',    km: 0 },
    { name: '品川',    km: 6.8 },
    { name: '新横浜',  km: 25.5 },
    { name: '小田原',  km: 71.4 },
    { name: '熱海',    km: 95.4 },
    { name: '三島',    km: 111.9 },
    { name: '新富士',  km: 135 },
    { name: '静岡',    km: 167.4 },
    { name: '掛川',    km: 211.3 },
    { name: '浜松',    km: 238.9 },
    { name: '豊橋',    km: 274.2 },
    { name: '三河安城', km: 312.8 },
    { name: '名古屋',  km: 342 },
    { name: '岐阜羽島', km: 367.1 },
    { name: '米原',    km: 408.2 },
    { name: '京都',    km: 476.3 },
    { name: '新大阪',  km: 515.4 },
  ],
};

export const TOHOKU: Route = {
  id: 'tohoku',
  name: '東北新幹線',
  stations: [
    { name: '東京',           km: 0 },
    { name: '上野',           km: 3.6 },
    { name: '大宮',           km: 30.3 },
    { name: '小山',           km: 80.6 },
    { name: '宇都宮',         km: 109.5 },
    { name: '那須塩原',       km: 157.8 },
    { name: '新白河',         km: 185.4 },
    { name: '郡山',           km: 226.7 },
    { name: '福島',           km: 272.8 },
    { name: '白石蔵王',       km: 306.8 },
    { name: '仙台',           km: 351.8 },
    { name: '古川',           km: 395.0 },
    { name: 'くりこま高原',   km: 416.2 },
    { name: '一ノ関',         km: 445.1 },
    { name: '水沢江刺',       km: 470.1 },
    { name: '北上',           km: 487.5 },
    { name: '新花巻',         km: 500.0 },
    { name: '盛岡',           km: 535.3 },
    { name: 'いわて沼宮内',   km: 566.4 },
    { name: '二戸',           km: 601.0 },
    { name: '八戸',           km: 631.9 },
    { name: '七戸十和田',     km: 668.0 },
    { name: '新青森',         km: 713.7 },
    { name: '奥津軽いまべつ', km: 752.2 },
    { name: '木古内',         km: 827.0 },
    { name: '新函館北斗',     km: 862.5 },
  ],
};

export const JOETSU: Route = {
  id: 'joetsu',
  name: '上越新幹線',
  stations: [
    { name: '東京',       km: 0 },
    { name: '上野',       km: 3.6 },
    { name: '大宮',       km: 30.3 },
    { name: '熊谷',       km: 64.7 },
    { name: '本庄早稲田', km: 86.7 },
    { name: '高崎',       km: 105.0 },
    { name: '上毛高原',   km: 151.6 },
    { name: '越後湯沢',   km: 181.0 },
    { name: '浦佐',       km: 208.9 },
    { name: '長岡',       km: 245.1 },
    { name: '燕三条',     km: 274.1 },
    { name: '新潟',       km: 303.6 },
  ],
};

export const KYUSHU: Route = {
  id: 'kyushu',
  name: '九州新幹線',
  stations: [
    { name: '博多',       km: 0 },
    { name: '新鳥栖',     km: 26.3 },
    { name: '久留米',     km: 33.2 },
    { name: '筑後船小屋', km: 47.9 },
    { name: '新大牟田',   km: 66.2 },
    { name: '新玉名',     km: 87.3 },
    { name: '熊本',       km: 118.4 },
    { name: '新八代',     km: 151.2 },
    { name: '水俣',       km: 189.1 },
    { name: '出水',       km: 205.3 },
    { name: '川内',       km: 244.0 },
    { name: '鹿児島中央', km: 289.2 },
  ],
};

export const YAMANOTE: Route = {
  id: 'yamanote',
  name: '山手線',
  stations: [
    { name: '東京',           km: 0 },
    { name: '神田',           km: 1.3 },
    { name: '秋葉原',         km: 2.0 },
    { name: '御徒町',         km: 3.0 },
    { name: '上野',           km: 3.6 },
    { name: '鶯谷',           km: 4.7 },
    { name: '日暮里',         km: 5.8 },
    { name: '西日暮里',       km: 6.3 },
    { name: '田端',           km: 7.1 },
    { name: '駒込',           km: 8.7 },
    { name: '巣鴨',           km: 9.4 },
    { name: '大塚',           km: 10.5 },
    { name: '池袋',           km: 12.3 },
    { name: '目白',           km: 13.5 },
    { name: '高田馬場',       km: 14.4 },
    { name: '新大久保',       km: 15.7 },
    { name: '新宿',           km: 17.0 },
    { name: '代々木',         km: 17.7 },
    { name: '原宿',           km: 19.2 },
    { name: '渋谷',           km: 20.4 },
    { name: '恵比寿',         km: 22.0 },
    { name: '目黒',           km: 23.5 },
    { name: '五反田',         km: 24.7 },
    { name: '大崎',           km: 25.6 },
    { name: '品川',           km: 27.6 },
    { name: '高輪ゲートウェイ', km: 28.5 },
    { name: '田町',           km: 29.8 },
    { name: '浜松町',         km: 31.3 },
    { name: '新橋',           km: 32.5 },
    { name: '有楽町',         km: 33.6 },
    { name: '東京（終着）',   km: 34.5 },
  ],
};

export const ROUTES: Route[] = [TOKAIDO, TOHOKU, JOETSU, KYUSHU, YAMANOTE];
