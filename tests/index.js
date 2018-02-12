'use strict';

require('dotenv').config();

const { Selector } = require('testcafe');

const landingPages = {
	classic: ['/home/home.jsp', '/setup/forcecomHomepage.apexp'],
	lightning: ['/one/one.app']
};

fixture('Test Org')
	.page('https://login.salesforce.com/')
	.beforeEach(async t => {
		if (!process.env.TEST_ORG_USERNAME)
			throw Error('TEST_ORG_USERNAME environment variable not set in .env file');
		if (!process.env.TEST_ORG_PASSWORD)
			throw Error('TEST_ORG_PASSWORD environment variable not set in .env file');

		await t
			.typeText('#username', process.env.TEST_ORG_USERNAME)
			.typeText('#password', process.env.TEST_ORG_PASSWORD)
			.click('#Login');

		const classicHeader = Selector('#phHeader');
		const lightningHeader = Selector('#oneHeader');

		// Await element in DOM and visibility check
		const [classicHeaderElement, lightningHeaderElement] = await Promise.all([
			classicHeader.with({ visibilityCheck: true })(),
			lightningHeader.with({ visibilityCheck: true, timeout: 60000 })()
		]);

		t.ctx.uiExperience = null;
		if (lightningHeaderElement) {
			t.ctx.uiExperience = 'lightning';
		}

		if (classicHeaderElement && classicHeader.exists) {
			t.ctx.uiExperience = 'classic';
		}
		await t.expect(t.ctx.uiExperience).notEql(null, 'Unknown UI Experience or failed to login');
	});

test('UI has Setup Link', async t => {
	let setupLinkSelector;
	switch (t.ctx.uiExperience) {
		case 'classic':
			setupLinkSelector = await Selector('#setupLink');
			break;
		case 'lightning':
			setupLinkSelector = await Selector('div.setupGear');
			break;
	}

	const setupLinkElement = await setupLinkSelector.with({ visibilityCheck: true })();
	await t.expect(setupLinkSelector.exists).ok();
});

test('Validate Org ID', async t => {
	const location = await t.eval(() => window.location);
	let companyInfoLink;
	let orgIdElement;
	let orgIdSelector;

	switch (t.ctx.uiExperience) {
		case 'lightning':
			companyInfoLink = location.origin + '/one/one.app#/setup/CompanyProfileInfo/home';
			await t.navigateTo(companyInfoLink);
			break;

		case 'classic':
			companyInfoLink = location.origin + '/setup/forcecomHomepage.apexp';
			await t
				.navigateTo(companyInfoLink)
				.click('#CompanyProfile_font')
				.click('#CompanyProfileInfo_font');

			break;
	}

	orgIdSelector = await Selector('table.detailList')
		.find('td.dataCol')
		.withText(process.env.TEST_ORG_ID);

	await t.expect(orgIdSelector.exists).ok();
	await t.expect(orgIdSelector.innerText).eql(process.env.TEST_ORG_ID);
});
