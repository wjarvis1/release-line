/**
 * Handles managing of dependents of the releaseline
 * @class
 */
class Dependent {
  /**
   * @constructor
   * @param {ReleaseLine} releaseline The ReleaseLine class
   */
  constructor(releaseline) {
    this.releaseline = releaseline;
    this.ReleaseLineDep = releaseline.models.ReleaseLineDep;
  }
  /**
   * For the given release line (pkg, version), add the dependent
   *
   * @function add
   * @param {Object} opts Options for creating ReleaseLineDep
   * @param {String} opts.pkg Name of root package
   * @param {String} opts.version Version of root package
   * @param {String} opts.dependent Name of dependent
   * @param {String} opts.dependentVersion Version of dependent
   * @returns {Promise} wrapped result
   */
  async add({ pkg, version = 'latest', dependent, dependentVersion }) {
    const { ReleaseLineDep } = this;

    if (version === 'latest') {
      const head = await this.releaseline.head(pkg);
      if (!head) throw new Error('Cannot add without version or a release-line-head');
      version = head.version;
    }

    return ReleaseLineDep.create({ pkg, version, dependent, dependentVersion });
  }
  /**
   * For the given release line (pkg, version), add the dependent
   *
   * @function remove
   * @param {Object} opts Options for creating ReleaseLineDep
   * @param {String} opts.pkg Name of root package
   * @param {String} opts.version Version of root package
   * @param {String} opts.dependent Name of dependent
   * @returns {Promise} wrapped result
   */
  async remove({ pkg, version = 'latest', dependent }) {
    const { ReleaseLineDep } = this;

    if (version === 'latest') {
      const head = await this.releaseline.head(pkg);
      if (!head) throw new Error('Cannot remove without version or a release-line-head');

      version = head.version;
    }
    //
    // Remove either one or all
    //
    if (dependent) {
      return ReleaseLineDep.remove({ pkg, version, dependent });
    }
    const dependents = await ReleaseLineDep.findAll({ pkg, version });
    return Promise.all(dependents.map(dep => ReleaseLineDep.remove(dep)));
  }
  /**
   * For the given release line (pkg, version), list the dependents
   *
   * @function list
   * @param {Object} opts Options for creating ReleaseLineDep
   * @param {String} opts.pkg Name of root package
   * @param {String} opts.version Version of root package
   * @returns {Promise} wrapped result
   */
  async list({ pkg, version = 'latest' }) {
    const { ReleaseLineDep } = this;

    if (version === 'latest') {
      const head = await this.releaseline.head(pkg);
      if (!head) return [];
      version = head.version;
    }

    return ReleaseLineDep.findAll({ pkg, version });
  }
  /**
   * For the given release line (pkg, version), get the dependent
   *
   * @function get
   * @param {Object} opts Options for creating ReleaseLineDep
   * @param {String} opts.pkg Name of root package
   * @param {String} opts.version Version of root package
   * @param {String} opts.dependent Name of dependent package
   * @returns {Promise} wrapped result
   */
  async get({ pkg, version = 'latest', dependent }) {
    const { ReleaseLineDep } = this;

    if (version === 'latest') {
      const head = await this.releaseline.head(pkg);
      if (!head) return null;
      version = head.version;
    }

    return ReleaseLineDep.get({ pkg, version, dependent });
  }

}

module.exports = Dependent;
