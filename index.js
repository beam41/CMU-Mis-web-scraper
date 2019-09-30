const puppeteer = require('puppeteer');
const fs = require('fs');

async function extract(browser, page, i, semester, year, ext) {
  const page2 = await browser.newPage();
  const c_status = await page.evaluate((sel) => {
    return document.querySelector(sel).textContent;
  }, '#gvCourseList_lblStatus_' + i);
  if (c_status === 'เปิด') {
    const courseNo = await page.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#gvCourseList_lblCourseID_' + i);

    const courseCredit = await page.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#gvCourseList_lblTotalCredit_' + i);

    await page2.goto(`https://mis.cmu.ac.th/tqf/coursepublic.aspx?courseno=${courseNo}&semester=${semester}&year=${year}`, {
      waitUntil: 'networkidle0'
    });

    const courseFac = await page2.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#lblFacultyName');

    const courseCodeEN = await page2.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#lblCourseCodeEng');

    let courseCodeTH = null;
    try {
      courseCodeTH = await page2.evaluate((sel) => {
        return document.querySelector(sel).textContent;
      }, '#lblCourseCodeTha');
    }
    catch (e) {
      console.log(`course ${courseNo} doesn't have Thai code`);
    }
    
    const courseNameEN = await page2.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#lblCourseTitleEng');

    let courseNameTH = null;
    try {
      courseNameTH = await page2.evaluate((sel) => {
        return document.querySelector(sel).textContent;
      }, '#lblCourseTitleTha');
    }
    catch (e) {
      console.log(`course ${courseNo} doesn't have Thai name`);
    }

    const courseDescEN = await page2.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#lblCourseDescriptionEng');

    let courseDescTH = null;
    try {
      courseDescTH = await page2.evaluate((sel) => {
        return document.querySelector(sel).textContent;
      }, '#lblCourseDescriptionTha');
    }
    catch (e) {
      console.log(`course ${courseNo} doesn't have Thai name`);
    }

    const coursePrereq = await page2.evaluate((sel) => {
      return document.querySelector(sel).textContent;
    }, '#lblPreequisite');

    page2.close();

    ext.push({
      courseFac,
      courseNo,
      courseCodeEN,
      courseCodeTH,
      courseNameEN,
      courseNameTH,
      courseDescEN,
      courseDescTH,
      courseCredit,
      coursePrereq
    });
  }
}

async function run(semester, year) {
  const browser = await puppeteer.launch({
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('https://mis.cmu.ac.th/TQF/coursepublic.aspx', {
    waitUntil: 'networkidle0'
  });

  // all the course except closed one
  let ext = [];

  if (!fs.existsSync('./courses')){
    fs.mkdirSync('./courses');
  }

  console.log(`Scraping CMU Mis for year: ${year} and semester: ${semester}`)
  // selecting semester and year
  await page.select('#ddlAcademicYear', year.toString());
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.select('#ddlAcademicTerm', semester.toString());
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

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
      if (pageNo === 1 && facNo > 1) {
        await page.click(`#gvCourseList > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(${1}) > a`);
        await page.waitForSelector('#lblCMUMIS');
      }
      // get total number of couse in page
      const courseLength = await page.evaluate((sel) => {
        return document.querySelector(sel).getElementsByTagName('tr').length;
      }, '#gvCourseList > tbody');

      // extraction!
      const promises = [];
      for (let i = 0; i < courseLength-5; i++) {
        promises.push(extract(browser, page, i, semester, year, ext));
      }
      await Promise.all(promises);
      const jsonContent = JSON.stringify(ext, null, 2);
      fs.writeFile(`./courses/${currFac}p${pageNo}.json`, jsonContent, 'utf8',(err) => {
        if (err) {
          return console.log(err);
        }
          console.log(`Current Faculty ${currFac} | Page ${pageNo} was saved!`);
      });
      ext = [];
      if (pageNo !== pageLength) {
        await page.click(`#gvCourseList > tbody > tr:nth-child(1) > td > table > tbody > tr > td:nth-child(${pageNo+1}) > a`);
        await page.waitForSelector('#lblCMUMIS');
      }
    }
  }
  browser.close();
}

run(1, 2561);