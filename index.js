 const axios = require('axios');
 const cheerio = require('cheerio');
 const fs = require('fs');

 const BASE_URL = 'https://gamefaqs.gamespot.com'


 const browserHeaders = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,pt-BR;q=0.7,en;q=0.3', 
  'cache-control': 'max-age=0', 
  cookie: 'gf_dvi=ZjYwNDgxMDhiMDAxNmQ0MDVmNjVlMTc1ZGQ4YjBmYTMyNjg3MDRhZDRkMzY2ZGFjYTczYzU1OWUzNjk5NjA0ODEwOGI%3D; gf_geo=MzcuMjE4LjI0NC4yNDk6ODQwOjA%3D; fv20210310=1; dfpsess=d; spt=yes; OptanonAlertBoxClosed=0000-00-00T00:00:00.000Z; OptanonConsent=geolocation=US%3B&datestamp=Tue+Mar+09+2021+21%3A22%3A17+GMT-0300+(Brasilia+Standard+Time)&version=6.7.0&isIABGlobal=false&hosts=&consentId=d1bcd3d8-e946-49ab-81a6-6edaa7619f7c&interactionCount=1&landingPath=NotLandingPage&groups=C0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1&AwaitingReconsent=false; AMCV_10D31225525FF5790A490D4D%40AdobeOrg=1585540135%7CMCIDTS%7C18697%7CMCMID%7C25896960859932997018295210173918780536%7CMCAID%7CNONE%7CMCOPTOUT-1615342937s%7CNONE%7CvVersion%7C4.4.0; s_vnum=1617927569790%26vn%3D1; s_invisit=true; s_getNewRepeat=1615335737245-New; s_lv_gamefaqs=1615335737246; s_lv_gamefaqs_s=First%20Visit; AMCVS_10D31225525FF5790A490D4D%40AdobeOrg=1; s_cc=true; OptanonAlertBoxClosed=2021-03-10T00:22:17.196Z', 
  referer: 'gamefaqs.gamespot.com',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate', 
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent':
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:86.0) Gecko/20100101 Firefox/86.0'
 };


 const slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();
  
    // remove accents, swap ñ for n, etc
    var from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
    var to = 'aaaaeeeeiiiioooouuuunc------';
    for (var i = 0, l = from.length; i < l; i++) {
      str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }
  
    str = str
      .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // collapse whitespace and replace by -
      .replace(/-+/g, '-'); // collapse dashes
  
    return str;
  };
  
  const writeToFile = (data, filename) => {
    const promiseCallback = (resolve, reject) => {
      fs.writeFile(filename, data, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(true);
      });
    };
    return new Promise(promiseCallback);
  };
  
  const readFromFile = (filename) => {
    const promiseCallback = (resolve) => {
      fs.readFile(filename, 'utf8', (error, contents) => {
        if (error) {
          resolve(null);
        }
        resolve(contents);
      });
    };
    return new Promise(promiseCallback);
  };
  
  const getPage = (path) => {
    const url = `${BASE_URL}${path}`;
    const options = {
      headers: browserHeaders,
    };
    return axios.get(url, options).then((response) => response.data);
  };
  
  const getCachedPage = (path) => {
    const filename = `cache/${slug(path)}.html`;
    const promiseCallback = async (resolve, reject) => {
      const cachedHTML = await readFromFile(filename);
      if (!cachedHTML) {
        const html = await getPage(path);
        await writeToFile(html, filename);
        resolve(html);
        return;
      }
      resolve(cachedHTML);
    };
  
    return new Promise(promiseCallback);
  };
  
  const saveData = (data, path) => {
    const promiseCallback = async (resolve, reject) => {
      if (!data || data.length === 0) return resolve(true);
      const dataToStore = JSON.stringify({ data: data }, null, 2);
      const created = await writeToFile(dataToStore, path);
      resolve(true);
    };
  
    return new Promise(promiseCallback);
  };
  
  const getPageItems = (html) => {
    const $ = cheerio.load(html);
    const promiseCallback = (resolve, reject) => {
      const selector = '#content > div.post_content.row > div > div:nth-child(1) > div.body > table > tbody > tr';
  
      const games = [];
      $(selector).each((i, element) => {
        const a = $('td.rtitle > a', element);
        const title = a.text();
        const href = a.attr('href');
        const id = href.split('/').pop();
        games.push({ id, title, path: href });
      });
  
      resolve(games);
    };
  
    return new Promise(promiseCallback);
  };
  
  const getAllPages = async (start, finish) => {
    let page = start;
    do {
      const path = `/n64/category/999-all?page=${page}`;
      await getCachedPage(path)
        .then(getPageItems)
        .then((data) => saveData(data, `./db/db-${page}.json`))
        .then(console.log)
        .catch(console.error);
      page++;
    } while (page < finish);
  };
  
  getAllPages(0, 10);
