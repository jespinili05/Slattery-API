const supabase = require('../config/supabase');

/**
 * Proposal Database Service
 * Handles database operations for proposals and proposal_versions tables
 */
class ProposalDatabaseService {

  static DEFAULT_CREATED_BY = 'db46f7c1-a3ea-4a11-855b-4b3c3cd76562';

  /**
   * Create a new proposal record
   */
  static async createProposal(title, createdBy = this.DEFAULT_CREATED_BY) {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          title,
          created_by: createdBy,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create proposal: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Database error creating proposal:', error);
      throw error;
    }
  }

  /**
   * Create a new proposal version
   */
  static async createProposalVersion({
    proposalId,
    versionNumber = 1,
    versionLabel = 'v1',
    documentPath,
    status = 'submitted',
    createdBy = this.DEFAULT_CREATED_BY,
    proposalData
  }) {
    try {
      const { data, error } = await supabase
        .from('proposal_versions')
        .insert({
          proposal_id: proposalId,
          version_number: versionNumber,
          version_label: versionLabel,
          document_path: documentPath,
          status,
          created_by: createdBy,
          proposal_data: proposalData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create proposal version: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Database error creating proposal version:', error);
      throw error;
    }
  }

  /**
   * Get the next version number for a proposal
   */
  static async getNextVersionNumber(proposalId) {
    try {
      const { data, error } = await supabase
        .from('proposal_versions')
        .select('version_number')
        .eq('proposal_id', proposalId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Failed to get version number: ${error.message}`);
      }

      const lastVersion = data && data.length > 0 ? data[0].version_number : 0;
      return lastVersion + 1;
    } catch (error) {
      console.error('Database error getting next version number:', error);
      throw error;
    }
  }

  /**
   * Find existing proposal by title
   */
  static async findProposalByTitle(title) {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('title', title)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Failed to find proposal: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Database error finding proposal:', error);
      throw error;
    }
  }

  /**
   * Generate filename with version information
   */
  static generateVersionedFilename(companyName, versionNumber, createdAt = new Date()) {
    const sanitizedCompany = companyName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const dateStr = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = createdAt.toISOString().split('T')[1].replace(/[:.]/g, '').substring(0, 6); // HHMMSS

    return `Proposal__${sanitizedCompany}_v${versionNumber}_${dateStr}_${timeStr}.pdf`;
  }

  /**
   * Create complete proposal with version (main method)
   */
  static async createProposalWithVersion(config, documentPath) {
    try {
      const companyName = config.Company;

      // Always create a new proposal instead of checking for existing ones
      const proposal = await this.createProposal(companyName);

      // Always start with version 1 for new proposals
      const versionNumber = 1;
      const versionLabel = 'v1';

      // Create proposal version
      const proposalVersion = await this.createProposalVersion({
        proposalId: proposal.id,
        versionNumber,
        versionLabel,
        documentPath,
        proposalData: config
      });

      return {
        proposal,
        version: proposalVersion,
        versionNumber,
        versionLabel
      };
    } catch (error) {
      console.error('Database error creating proposal with version:', error);
      throw error;
    }
  }

  /**
   * Get proposal with all versions
   */
  static async getProposalWithVersions(proposalId) {
    try {
      const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (proposalError) {
        throw new Error(`Failed to get proposal: ${proposalError.message}`);
      }

      const { data: versions, error: versionsError } = await supabase
        .from('proposal_versions')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('version_number', { ascending: false });

      if (versionsError) {
        throw new Error(`Failed to get proposal versions: ${versionsError.message}`);
      }

      return {
        ...proposal,
        versions
      };
    } catch (error) {
      console.error('Database error getting proposal with versions:', error);
      throw error;
    }
  }

  /**
   * Update proposal version status
   */
  static async updateVersionStatus(versionId, status) {
    try {
      const { data, error } = await supabase
        .from('proposal_versions')
        .update({ status })
        .eq('id', versionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update version status: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Database error updating version status:', error);
      throw error;
    }
  }
}

module.exports = ProposalDatabaseService;