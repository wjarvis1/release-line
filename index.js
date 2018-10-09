const { AwaitWrap } = require('datastar');
const Dependent = require('./dependent');

/**
 * Manages high level release-line operations
 * @class
 */
class ReleaseLine {
  /**
   * @constructor
   * @param {Object} opts Options for ReleaseLine
   * @param {Object} models WarehouseModels
   */
  constructor({ models }) {

    if (!models) {
      throw new Error('Models are required');
    }

    this.models = ['ReleaseLine', 'ReleaseLineDep', 'ReleaseLineHead'].reduce((acc, name) => {
      acc[name] = new AwaitWrap(models[name]);
      return acc;
    }, {});

    this.dependent = new Dependent(this);
  }

  /**
   * Fetch release-line-head
   *
   * @function head
   * @param {String} pkg Name of package
   * @returns {Promise} wrapped result
   */
  head(pkg) {
    return this.models.ReleaseLineHead.get({ pkg });
  }
  /**
   * Create release-line, optionally creating dependents
   *
   * @function create
   * @param {Object} opts Options for creating ReleaseLines
   * @param {String} opts.version Version for the releaseline
   * @param {String} opts.pkg Package name of the releaseline
   * @param {Object[]} [opts.dependents] Dependent objects to create dependents
   * @returns {Promise} to be resolved
   */
  async create({ version, previousVersion, pkg, dependents = [] }) {
    const { ReleaseLine, ReleaseLineHead } = this.models;
    let previous;

    if (!previousVersion) previous = await this.head(pkg);

    previousVersion = previousVersion || (previous && previous.version);
    return Promise.all([
      ReleaseLine.create({ version, pkg, previousVersion }),
      ReleaseLineHead.create({ version, pkg, previousVersion })
    ].concat(dependents.map(dep => this.dependent.add({ pkg, version, ...dep })))
      .filter(Boolean));
  }
  /**
   * Delete release-line, and associated dependents
   *
   * @function delete
   * @param {Object} opts Options for deleting ReleaseLines
   * @param {String} opts.version Version for the releaseline
   * @param {String} opts.pkg Package name of the releaseline
   * @returns {Promise} to be resolved
   */
  async delete({ version = 'latest', pkg }) {
    const { ReleaseLine } = this.models;

    if (version === 'latest') {
      const prev = await this.head(pkg);
      version = prev.version;
    }

    return Promise.all([
      ReleaseLine.remove({ pkg, version }),
      this.dependent.remove({ pkg, version })
    ]);
  }
  /**
   * Get the ReleaseLine and ReleaseLineDeps and return the compiled version
   *
   * @function get
   * @param {Object} opts Options for getting ReleaseLine
   * @param {String} opts.version Version of ReleaseLine
   * @param {String} opts.pkg Name of package of ReleaseLine
   * @returns {Promise} wrapped object to be resolved with await
   */
  async get({ version = 'latest', pkg }) {
    const { ReleaseLine, ReleaseLineDep, ReleaseLineHead } = this.models;
    const headFetch = version === 'latest';

    let [release, dependents] = await Promise.all([
      headFetch ?  ReleaseLineHead.get({ pkg }) : ReleaseLine.get({ version, pkg }),
      !headFetch && this.dependent.list({ version, pkg })
    ].filter(Boolean));

    if (!release) return null;

    if (headFetch) {
      version = release.version;
      dependents = await ReleaseLineDep.findAll({ version, pkg });
    }


    return this.compile({ release, version, dependents });
  }

  /**
   * Compile the release-line data structure from the two separate models
   *
   * @public
   * @function compile
   * @param {Object} opts Options for compiling
   * @param {ReleaseLine} opts.release ReleaseLine from database
   * @param {String} opts.version Version of releaseLine
   * @param {ReleaseLineDep[]} opts.dependents ReleaseLineDeps from database
   * @returns {Object} compiled releaseLine for consumption
   */
  compile({ release, version, dependents }) {
    return {
      pkg: release.pkg,
      version: version,
      previousVersion: release.previousVersion,
      dependents: dependents.reduce((acc, dep) => {
        acc[dep.dependent] = dep.dependentVersion;
        return acc;
      }, {})
    };
  }
}


module.exports = ReleaseLine;
