const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const puppeteer = require('puppeteer');

setDefaultTimeout(60 * 1000);

let browser, page, emailSubject;

const delay = (time) => new Promise(resolve => setTimeout(resolve, time));

/**
 * Puppeteer browser elinditása
 */
async function puppeteerBrowserLaunch() {
    browser = await puppeteer.launch({ headless: false, slowMo: 100, defaultViewport: false });
    page = await browser.newPage();
}

/**
 * Outlook login oldalra való navigálás
 */
async function outlookLoginNavigation() {
    await page.goto('https://outlook.com');
    const [newPage] = await Promise.all([
        new Promise(resolve => browser.once('targetcreated', target => resolve(target.page()))),
        page.click('#action-oc5b26'),
    ]);
    page = newPage;
}

/**
 * Bejelentkezéshez szükséges mezők kitöltése
 */
async function loginCredentials(email, password) {
    await page.waitForSelector('input#i0116', { visible: true, timeout: 60000 });
    await page.type('input#i0116', email);
    await page.click('button[type="submit"]');

    await page.waitForSelector('input[type="password"]', { visible: true, timeout: 60000 });
    await page.type('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
}

/**
 * Felugró ablakok kezelése
 */
async function popupsHandler() {
    try {
        await page.waitForSelector('#acceptButton', { visible: true, timeout: 10000 });
        await page.click('#acceptButton');
    } catch (error) {
        console.log('Nem sikerült elfogadni/nem volt rá szükség', error);
    }

    try {
        await page.waitForSelector('span#id__8', { visible: true, timeout: 3000 });
        await page.click('span#id__8');
        console.log("Popup bezárva.");
    } catch (error) {
        console.log('Ok gomb-ot nem sikerült elfogadni/nem volt rá szükség', error);
    }
}

/**
 * Email küldése
 */
async function sendEmail(recipient) {
    await page.waitForSelector('button[aria-label="Új üzenet"]', { visible: true, timeout: 30000 });
    await page.click('button[aria-label="Új üzenet"]');

    await delay(10000);

    await page.waitForSelector('div[role="textbox"][aria-label="Címzett"]', { visible: true, timeout: 10000 });
    await page.type('div[role="textbox"][aria-label="Címzett"]', recipient);

    await delay(10000);

    emailSubject = `${Math.floor(Math.random() * 10)} számú teszt email`;
    await page.waitForSelector('input[aria-label="Adja meg a tárgyat"]', { visible: true, timeout: 300000 });
    await page.type('input[aria-label="Adja meg a tárgyat"]', emailSubject);

    await page.waitForSelector('div[aria-label="Üzenet szövege, nyomja meg az Alt+F10 gombot a kilépéshez"]', { visible: true, timeout: 10000 });
    await page.type('div[aria-label="Üzenet szövege, nyomja meg az Alt+F10 gombot a kilépéshez"]', 'Ez egy test email');

    await page.click('button[aria-label="Küldés"]');
    await delay(3000);
}

/**
 * "Elküldött elemek"-hez való átnavigálás és ellenőrzés, hogy valóban sikerült elküldeni
 */
async function verifySentMails() {
    await page.evaluate(() => {
        const sentItemsFolder = Array.from(document.querySelectorAll('div[title]'))
            .find(div => div.getAttribute('title').startsWith('Elküldött elemek'));
        if (sentItemsFolder) sentItemsFolder.click();
    });

    await delay(5000);

    const sentEmailSubjects = await page.evaluate(() =>
        Array.from(document.querySelectorAll('span.TtcXM')).map(span => span.textContent)
    );

    
    if (!sentEmailSubjects.includes(emailSubject)) {
        throw new Error(`Nem található meg a "${emailSubject}" tárgyú email.`);
    } else{
        console.log('Megtalálható a ', sentEmailSubjects,'tárgyú email');
    }
}

/**
 * Összes elküldött email kitörlése
 */
async function deleteSentEmails() {
    await page.evaluate(() => {
        const emptyFolderButton = document.querySelector('button[aria-label="Mappa ürítése"]');
        if (emptyFolderButton) setTimeout(() => emptyFolderButton.click(), 5000);
    });

    await delay(10000);

    await page.evaluate(() => {
        const deleteAllButton = Array.from(document.querySelectorAll('button'))
            .find(button => button.textContent.includes("Az összes törlése"));
        if (deleteAllButton) setTimeout(() => deleteAllButton.click(), 5000);
    });

    await delay(10000);
}

Given('I am logged into Outlook', async () => {
    await puppeteerBrowserLaunch();
    await outlookLoginNavigation();
    await delay(3000);
    await loginCredentials('fintechXTivadar@outlook.hu', 'Tivadar01');
    await delay(3000);
    await popupsHandler();
    await delay(3000);
});

When('I send an email with a randomized subject to {string}', async (recipient) => {
    await sendEmail(recipient);
});

Then('I should check sent emails', async () => {
    await verifySentMails();
});

Then('I delete sent mails', async () => {
    await deleteSentEmails();
});
