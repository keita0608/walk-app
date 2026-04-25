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

export const ROUTES: Route[] = [TOKAIDO];
