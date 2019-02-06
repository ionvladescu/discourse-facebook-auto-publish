import * as puppeteer from 'puppeteer';
import { sleep } from './helper';

const ID = {
  login: '#m_login_email', //m.facebook login email input
  pass: '#m_login_password', //m.facebook login password input
  loginButton: 'button[data-sigil="touchable m_login_button"]', //m.facebook login subbmit button
  groupComposer: 'div[role="textbox"]',
  groupComposerTextFiled: 'textarea[data-sigil="composer-textarea m-textarea-input"]',
  groupSendPostBtn: 'button[data-sigil="submit_composer"]',
};

let fbPage: puppeteer.Page | null;

export async function init() {
  const options: puppeteer.LaunchOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications'],
  };

  if (process.env.NODE_ENV === 'development') {
    options.headless = false;
  }

  const browser = await puppeteer.launch(options);
  const _page = await browser.newPage();

  _page.on('dialog', async dialog => {
    console.log(dialog.message());
    await dialog.accept();
  });
  // login
  if (!process.env.FACEBOOK_USER || !process.env.FACEBOOK_PASS) {
    throw 'now facebook account';
  }
  await _page.goto('https://m.facebook.com/', {
    waitUntil: 'networkidle2',
  });
  await sleep(3000);
  await _page.waitForSelector(ID.login);
  await _page.type(ID.login, process.env.FACEBOOK_USER);
  await _page.type(ID.pass, process.env.FACEBOOK_PASS);
  await sleep(1000);

  await Promise.all([_page.waitForNavigation(), _page.click(ID.loginButton)]);

  await _page.screenshot({
    path: 'public/after_login.png',
  });

  fbPage = _page;
}

async function takeScreenshot(path: string) {
  if (!fbPage) {
    throw 'no facebook puppeteer page';
  }
  try {
    await fbPage.screenshot({ path });
  } catch (error) {
    console.log('screenshot error:', 'public/before_group.png', error);
  }
}

export async function gotoGroupAndPost(message: any) {
  if (!fbPage) {
    // throw new Error('Please init fbPuppeteer before use');
    await init();
  }

  if (!fbPage) {
    throw 'no facebook puppeteer page';
  }
  try {
    await Promise.all([fbPage.waitForNavigation(), fbPage.click('button[value="확인"]')]);
  } catch (e) {
    console.error(e);
  }

  // 이상 로그인으로 분류 되었을 때 피하기 위한 로직
  // try {
  //   await fbPage.click('#checkpointSubmitButton-actual-button');
  //   await sleep(4000);
  //   await fbPage.screenshot({
  //     path: 'public/before_select.png'
  //   });
  //   await fbPage.click('label:nth-of-type(2)').catch((e)=>{
  //     console.error('### label', e);
  //   });
  //   await sleep(4000);
  //   await fbPage.click('#checkpointSubmitButton-actual-button').catch(()=>{});;
  //   await sleep(4000);
  //   await fbPage.click('input[value="1900"]').catch(()=>{});;
  //   await sleep(4000);
  //   await fbPage.click('input[value="1"]').catch(()=>{});;
  //   await sleep(4000);
  //   await fbPage.click('input[value="31"]').catch(()=>{});;
  //   await sleep(4000);
  //   await fbPage.click('#checkpointSubmitButton-actual-button').catch(()=>{});;
  //   await sleep(4000);
  //   await fbPage.click('#checkpointSubmitButton-actual-button').catch(()=>{});;
  //   await sleep(4000);

  // } catch (e){
  //   console.error(e);
  // }

  await takeScreenshot('public/before_group.png');

  if (!process.env.FACEBOOK_GROUP_URL) {
    throw 'no facebook group url';
  }
  try {
    await fbPage.goto(process.env.FACEBOOK_GROUP_URL, {
      waitUntil: 'networkidle2',
    });

    await sleep(5000);
    await fbPage.waitForSelector(ID.groupComposer);

    await takeScreenshot('public/after_groups.png');
    await fbPage.click(ID.groupComposer);
    await sleep(5000);
    await fbPage.waitForSelector(ID.groupComposerTextFiled);
    await fbPage.click(ID.groupComposerTextFiled);
    await fbPage.keyboard.type(message + ' '); // Types instantly. Add last space for previwing link
    await takeScreenshot('public/after_type.png');
    await sleep(5000);

    if (process.env.NODE_ENV === 'development') {
      await fbPage.keyboard.press('Escape');
      await fbPage.keyboard.press('Escape');
      await fbPage.keyboard.press('Escape');
    } else {
      await fbPage.click(ID.groupSendPostBtn);
    }

    await sleep(1000);
  } catch (e) {
    console.error(e);
    await takeScreenshot('public/group_error.png');
    fbPage = null;
    throw e;
  }
}