const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkPackage } = require('./check-publication-content.cjs');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this check with npm run test:package');
const temporaryParent = fs.realpathSync(os.tmpdir());
const temporaryRoot = fs.mkdtempSync(path.join(temporaryParent, 'fieldhub-package-test-'));

function npm(args, cwd) {
	const result = spawnSync(process.execPath, [npmCli, ...args], {
		cwd,
		encoding: 'utf8',
		timeout: 120000,
		windowsHide: true,
	});
	if (result.error) throw result.error;
	assert.equal(result.status, 0, result.stdout + result.stderr);
	return result.stdout;
}

try {
	const cache = path.join(temporaryRoot, 'cache');
	const archiveDirectory = path.join(temporaryRoot, 'archive');
	const consumerDirectory = path.join(temporaryRoot, 'consumer');
	fs.mkdirSync(archiveDirectory);
	fs.mkdirSync(consumerDirectory);
	fs.writeFileSync(
		path.join(consumerDirectory, 'package.json'),
		JSON.stringify({ name: 'fieldhub-install-check', private: true, version: '1.0.0' }),
	);
	const [archive] = JSON.parse(
		npm(
			['pack', '--json', '--offline', '--cache', cache, '--pack-destination', archiveDirectory],
			root,
		),
	);
	npm(
		[
			'install',
			path.join(archiveDirectory, archive.filename),
			'--offline',
			'--cache',
			cache,
			'--no-audit',
			'--no-fund',
			'--legacy-peer-deps=false',
			'--ignore-scripts=false',
		],
		consumerDirectory,
	);
	const lock = JSON.parse(
		fs.readFileSync(path.join(consumerDirectory, 'package-lock.json'), 'utf8'),
	);
	assert.deepEqual(Object.keys(lock.packages).sort(), ['', 'node_modules/n8n-nodes-fieldhub']);
	const installedRoot = path.join(consumerDirectory, 'node_modules', 'n8n-nodes-fieldhub');
	const manifest = JSON.parse(fs.readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
	checkPackage(installedRoot, archive.files);
	assert.equal(manifest.peerDependenciesMeta['n8n-workflow'].optional, true);
	for (const entry of [...manifest.n8n.nodes, ...manifest.n8n.credentials]) {
		assert.ok(fs.existsSync(path.join(installedRoot, entry)), 'Missing package entry: ' + entry);
	}
	// Resolve the workflow runtime from the host, just as n8n does for community nodes.
	const loader = spawnSync(
		process.execPath,
		[
			'-e',
			`
		const assert = require('node:assert/strict');
		const path = require('node:path');
		const installed = process.argv[1];
		const manifest = require(path.join(installed, 'package.json'));
		for (const entry of [...manifest.n8n.nodes, ...manifest.n8n.credentials]) {
			const exports = require(path.join(installed, entry));
			const Constructor = Object.values(exports).find((value) => typeof value === 'function');
			assert.equal(typeof Constructor, 'function');
			const instance = new Constructor();
			if (entry.endsWith('.node.js')) {
				assert.equal(instance.description.displayName, 'FieldHub');
				const operations = instance.description.properties.filter((field) => field.name === 'operation');
				assert.equal(operations.length, 52);
				assert.equal(operations.flatMap((field) => field.options).length, 281);
			} else {
				assert.ok(instance.properties.some((field) => field.name === 'baseUrl' && field.default === '' && field.required));
			}
		}
	`,
			installedRoot,
		],
		{
			encoding: 'utf8',
			timeout: 30000,
			windowsHide: true,
			env: { ...process.env, NODE_PATH: path.join(root, 'node_modules') },
		},
	);
	if (loader.error) throw loader.error;
	assert.equal(loader.status, 0, loader.stdout + loader.stderr);
	assert.deepEqual(
		fs.readFileSync(path.join(installedRoot, 'dist/nodes/Fieldhub/fieldhub.png')),
		fs.readFileSync(path.join(root, 'nodes/Fieldhub/fieldhub.png')),
	);
	for (const icon of ['fieldhub.svg', 'fieldhub.dark.svg']) {
		const installedIcon = fs.readFileSync(path.join(installedRoot, 'dist/nodes/Fieldhub', icon));
		assert.deepEqual(installedIcon, fs.readFileSync(path.join(root, 'nodes/Fieldhub', icon)));
		const embeddedImage = installedIcon
			.toString('utf8')
			.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
		assert.ok(embeddedImage, 'Icon must preserve the original artwork');
		assert.deepEqual(
			Buffer.from(embeddedImage[1], 'base64'),
			fs.readFileSync(path.join(root, 'nodes/Fieldhub/fieldhub.png')),
		);
	}
	console.log(
		'Package installs offline without additional runtime dependencies; content, entries, documentation and logo verified.',
	);
} finally {
	const resolvedRoot = fs.realpathSync(temporaryRoot);
	assert.equal(path.dirname(resolvedRoot), temporaryParent);
	assert.ok(path.basename(resolvedRoot).startsWith('fieldhub-package-test-'));
	fs.rmSync(resolvedRoot, { recursive: true, force: true });
}
