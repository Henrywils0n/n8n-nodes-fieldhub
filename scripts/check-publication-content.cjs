const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Only documented vendor links, maintainer links, and upstream example hosts.
// Adding a new real host requires an explicit review; do not allow tenant suffixes.
const approvedHosts = new Set([
	'github.com',
	'docs.n8n.io',
	'creators.n8n.io',
	'docs.npmjs.com',
	'npmjs.com',
	'www.npmjs.com',
	'registry.npmjs.org',
	'doc.fieldhub.com',
	'www.w3.org',
	'ns.adobe.com',
	'purl.org',
	'localhost',
	'hooks.slack.com',
	'hooks.zapier.com',
	'api.crm.yourdomain.com',
	'crm.yourdomain.com',
	'new-url.com',
	'your-app.com',
	'your-crm.com',
	'your-server.com',
]);
const secretPatterns = [
	/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
	/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|npm_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b/,
	/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/,
];

function checkPublicText(file, text) {
	// Never include matched content in errors: it may itself be private.
	assert.ok(
		!/[A-Za-z]:[\\/]+(?:Users|Documents and Settings)[\\/]/i.test(text),
		'Local user path in ' + file,
	);
	assert.ok(
		!/\/(?:Users|home)\/(?!node\/)[A-Za-z0-9._-]+\//.test(text),
		'Local home path in ' + file,
	);
	for (const pattern of secretPatterns)
		assert.ok(!pattern.test(text), 'Possible secret in ' + file);
	for (const match of text.matchAll(/https?:\/\/[^\s<>"'\x60{}\\]+/g)) {
		const candidate = match[0].replace(/[),.;]+$/, '');
		let url;
		try {
			url = new URL(candidate);
		} catch {
			continue;
		} // Partial expressions are validated at runtime.
		assert.ok(!url.username && !url.password, 'Embedded URL credentials in ' + file);
		const host = url.hostname;
		const exampleHost = ['example.com', 'example.org', 'example.net', 'test'].some(
			(domain) => host === domain || host.endsWith('.' + domain),
		);
		assert.ok(exampleHost || approvedHosts.has(host), 'Unreviewed URL host in ' + file);
	}
}

function readTree(root, relative, visitor) {
	const absolute = path.join(root, relative);
	for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
		assert.ok(!entry.isSymbolicLink(), 'Unexpected symlink in publication content');
		const file = path.posix.join(relative, entry.name);
		if (entry.isDirectory()) readTree(root, file, visitor);
		else visitor(file, fs.readFileSync(path.join(root, file), 'utf8'));
	}
}

function checkSource(root) {
	for (const directory of ['api', 'credentials', 'nodes', 'docs', 'examples']) {
		readTree(root, directory, checkPublicText);
	}
	for (const file of ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE']) {
		checkPublicText(file, fs.readFileSync(path.join(root, file), 'utf8'));
	}
}

function checkPackage(root, files) {
	const document =
		/^(?:package\.json|README\.md|LICENSE|CHANGELOG\.md|docs\/(?:operations|publishing|api-upgrade-10\.4\.32)\.md|examples\/work-order-lookup\.json)$/;
	const runtime =
		/^dist\/(?:credentials|nodes\/Fieldhub)\/[A-Za-z0-9_./-]+\.(?:js|js\.map|json|d\.ts|svg|png)$/;
	for (const { path: file } of files) {
		assert.ok(
			!file.includes('FieldhubOAuth2Api'),
			'Disabled OAuth2 credential must not be packaged',
		);
		assert.ok(
			!file.split('/').includes('..') && (document.test(file) || runtime.test(file)),
			'Unexpected packaged file: ' + file,
		);
		checkPublicText(file, fs.readFileSync(path.join(root, file), 'utf8'));
	}
	const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
	assert.equal(manifest.license, 'MIT');
	assert.equal(manifest.n8n.strict, true);
	assert.deepEqual(manifest.n8n.credentials, ['dist/credentials/FieldhubApi.credentials.js']);
	assert.ok(manifest.keywords.includes('n8n-community-node-package'));
	assert.deepEqual(Object.keys(manifest.dependencies ?? {}), []);
	assert.deepEqual(Object.keys(manifest.optionalDependencies ?? {}), []);
	assert.deepEqual(Object.keys(manifest.peerDependencies ?? {}), ['n8n-workflow']);
	assert.equal(manifest.peerDependenciesMeta['n8n-workflow'].optional, true);
	for (const hook of ['preinstall', 'install', 'postinstall'])
		assert.equal(manifest.scripts[hook], undefined);
	for (const file of [
		'README.md',
		'LICENSE',
		'CHANGELOG.md',
		'docs/operations.md',
		'docs/publishing.md',
		'docs/api-upgrade-10.4.32.md',
		'examples/work-order-lookup.json',
	]) {
		assert.ok(
			files.some((entry) => entry.path === file),
			'Missing publication document: ' + file,
		);
	}
}

module.exports = { checkPublicText, checkSource, checkPackage };
if (require.main === module) {
	checkSource(path.resolve(__dirname, '..'));
	console.log(
		'Publication source content checked: reviewed URL hosts, local paths and common secret formats.',
	);
}
