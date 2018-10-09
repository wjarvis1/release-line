const assume = require('assume');
const Datastar = require('datastar');
const wrhsModels = require('warehouse-models');
const config = require('./config');
const sinon = require('sinon');

assume.use(require('assume-sinon'));
const ReleaseLine = require('..');

describe('@wrhs/release-line', function () {
  this.timeout(5E4);
  let models;
  let release;
  let datastar;

  before((done) => {
    datastar = new Datastar(config);
    models = wrhsModels(datastar);
    release = new ReleaseLine({ models });
    datastar.connect(done);
  });

  beforeEach(async () => {
    await Promise.all(Object.values(release.models).map(model => {
      return model.ensure();
    }));
  });

  afterEach(async () => {
    await Promise.all(Object.values(release.models).map(model => {
      return model.drop();
    }));
  });

  after(done => {
    datastar.close(done);
  });

  it('should throw an error if constructed without models', function () {
    /* eslint-disable-next-line */
    assume(function () { new ReleaseLine();}).to.throw();
  });
  it('should create and get release-line model with no dependents', async function () {
    const spec = { version: '4.0.0', pkg: 'release-test' };
    await release.create(spec);
    const releaseline = await release.get(spec);
    assume(releaseline.pkg).equals(spec.pkg);
    assume(releaseline.version).equals(spec.version);
    assume(releaseline.previousVersion).is.falsey();
    assume(releaseline.dependents).is.an('object');
    assume(Object.keys(releaseline.dependents)).has.length(0);
    await release.delete(spec);
  });

  it('should create and get a release-line model with dependents', async function () {
    const spec = {
      version: '4.0.0',
      pkg: 'release-test',
      dependents: [{
        dependent: 'release-test-dep1',
        dependentVersion: '4.0.0'
      }, {
        dependent: 'release-test-dep2',
        dependentVersion: '4.0.0'
      }]
    };

    await release.create(spec);
    const releaseline = await release.get(spec);
    assume(releaseline.pkg).equals(spec.pkg);
    assume(releaseline.version).equals(spec.version);
    assume(releaseline.previousVersion).is.falsey();
    assume(releaseline.dependents).is.an('object');
    assume(Object.keys(releaseline.dependents)).has.length(2);
    assume(releaseline.dependents['release-test-dep1']).equals('4.0.0');
    assume(releaseline.dependents['release-test-dep2']).equals('4.0.0');
    await release.delete(spec);
  });

  it('should create a release line without fetching head when given previousVersion', async function () {
    const spec = {
      version: '4.0.1',
      previousVersion: '4.0.0',
      pkg: 'release-huh'
    };

    const spy = sinon.spy(release, 'head');
    await release.create(spec);
    assume(spy).is.not.called();
    sinon.restore();

    const releaseline = await release.get(spec);
    assume(releaseline.pkg).equals(spec.pkg);
    assume(releaseline.version).equals(spec.version);
    assume(releaseline.previousVersion).equals(spec.previousVersion);
    await release.delete(spec);
  });

  it('should create and fetch the latest head releaseline without version', async function () {
    const version = '4.0.0';
    const pkg = 'release-test';

    await release.create({ pkg, version });
    const head = await release.get({ pkg });
    assume(head.pkg).equals(pkg);
    assume(head.version).equals(version);
  });

  it('should return falsey result when package doesnt exist', async function () {
    const result = await release.get({ pkg: 'foo' });
    assume(result).is.falsey();
  });

  it('should return a release-line-head with a previousVersion when there was a prior existing release-line', async function () {
    const spec = { version: '4.0.0', pkg: 'release-test' };
    await release.create(spec);
    await release.create({ ...spec, version: '5.0.0' });

    const releaseline = await release.get({ pkg: spec.pkg });
    assume(releaseline.version).equals('5.0.0');
    assume(releaseline.previousVersion).equals(spec.version);
    assume(releaseline.pkg).equals(spec.pkg);
  });

  it('should delete the release-line without version', async function () {
    const version = '4.0.0';
    const pkg = 'release-test';
    await release.create({ version, pkg });
    await release.delete({ pkg });
    const result = await release.get({ version, pkg });
    assume(result).is.falsey();
  });

  it('dependent: should return a falsey value when getting a non-existent dependent with version', async function () {
    const spec = { pkg: 'release-test', version: '4.0.0', dependent: 'release-test-dep1' };
    const dep = await release.dependent.get(spec);
    assume(dep).is.falsey();
  });

  it('dependent: should add, get and delete a dependent without version, assuming latest head release-line', async function () {
    const pkg = 'release-test';
    const version = '4.0.0';
    const dependent = 'release-test-dep';
    const dependentVersion = '3.0.0';
    await release.create({ pkg, version });

    await release.dependent.add({ pkg, dependent, dependentVersion });

    const dep = await release.dependent.get({ pkg, dependent });

    assume(dep.version).equals(version);
    assume(dep.pkg).equals(pkg);
    assume(dep.dependent).equals(dependent);
    assume(dep.dependentVersion).equals(dependentVersion);

    await release.dependent.remove({ pkg, dependent });

  });

  it('depdendent: should throw an error when there is no release-line-head for add', async function () {
    const pkg = 'release-test';
    const dependent = 'release-test-dep';
    const dependentVersion = '3.0.0';

    await assume(release.dependent.add({ pkg, dependent, dependentVersion })).to.throwAsync();

  });

  it('depdendent: should return falsey value when there is no release-line-head for get', async function () {
    const pkg = 'release-test';
    const dependent = 'release-test-dep';

    const res = await release.dependent.get({ pkg, dependent });
    assume(res).is.falsey();
  });

  it('dependent: should throw an error when there is no release-line-head for remove', async function () {
    const pkg = 'release-test';
    const dependent = 'release-test-dep';

    await assume(release.dependent.remove({ pkg, dependent })).to.throwAsync();
  });

  it('dependent: should return an empty array when there is no release-line-head for list', async function () {
    const pkg = 'release-test';

    const res = await release.dependent.list({ pkg });
    assume(res).is.an('array');
    assume(res).has.length(0);
  });

  it('dependent: should return array of dependents for list without version', async function () {
    const pkg = 'release-test';
    const version = '3.0.0';
    const dependents = [{ dependent: 'release-test-dep', dependentVersion: '4.0.0' }];

    await release.create({ pkg, version, dependents });

    const deps = await release.dependent.list({ pkg });
    assume(deps).has.length(1);
    assume(deps[0].pkg).equals(pkg);
    assume(deps[0].version).equals(version);
    assume(deps[0].dependent).equals(dependents[0].dependent);
    assume(deps[0].dependentVersion).equals(dependents[0].dependentVersion);
  });
});
