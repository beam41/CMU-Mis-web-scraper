const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://mis.cmu.ac.th/TQF/coursepublic.aspx', {
    waitUntil: 'networkidle0'
  });

  // all the course except closed one
  let ext = [];

  // foreach facNo 1 - 21
  for (let facNo = 1; facNo <= 21; facNo++) {
    const currFac = facNo.toString().padStart(2, '0');
    console.log(`Current Faculty ${currFac}`);
    // select faculty zone
    await page.select('#ddlListFaculty', currFac); // TODO: run on every faculty
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.click('#btnSearch');
    await page.waitForSelector('#lblCMUMIS');
    
    // get total number of page
    const pageLength = await page.evaluate((sel) => {
      return document.querySelector(sel).getElementsByTagName('td').length;
    }, '#gvCourseList > tbody > tr:nth-child(1) > td > table > tbody > tr');

    for (let pageNo = 1; pageNo <= pageLength; pageNo++) {
      console.log(`Current Faculty ${currFac} | Page ${pageNo}`);
      // get total number of couse in page
      const courseLength = await page.evaluate((sel) => {
        return document.querySelector(sel).getElementsByTagName('tr').length;
      }, '#gvCourseList > tbody');

      // extraction!
      for (let i = 0; i < courseLength-5; i++) {
        const c_status = await page.evaluate((sel) => {
          return document.querySelector(sel).innerText;
        }, '#gvCourseList_lblStatus_' + i);
        if (c_status === 'เปิด') {
          const courseNo = await page.evaluate((sel) => {
            return document.querySelector(sel).textContent;
          }, '#gvCourseList_lblCourseID_' + i);

          const courseName = await page.evaluate((sel) => {
            return document.querySelector(sel).textContent;
          }, '#gvCourseList_lbnDetailEng_' + i);

          const cc = await page.evaluate((sel) => {
            return document.querySelector(sel).textContent;
          }, '#gvCourseList_lblTotalCredit_' + i);
          courseCredit = +cc;

          ext.push({courseNo, courseName, courseCredit});
        }
      }
      if (pageNo !== pageLength) {
        await page.click(`#gvCourseList > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(${pageNo+1}) > a`);
        await page.waitForSelector('#lblCMUMIS');
      }
    }
  }
  const jsonContent = JSON.stringify(ext, null, 2);
  fs.writeFile("./course.json", jsonContent, 'utf8',(err) => {
    if (err) {
        return console.log(err);
    }
    console.log("The file was saved!");
  }); 
  browser.close();
}

run();