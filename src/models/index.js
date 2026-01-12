const User = require('./User');
const Note = require('./Note');
const NoteVersion = require('./NoteVersion');
const NoteShare = require('./NoteShare');
const NoteAttachment = require('./NoteAttachment');

// Define relationships
User.hasMany(Note, { foreignKey: 'userId', as: 'notes' });
Note.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

Note.hasMany(NoteVersion, { foreignKey: 'noteId', as: 'versions' });
NoteVersion.belongsTo(Note, { foreignKey: 'noteId', as: 'note' });
NoteVersion.belongsTo(User, { foreignKey: 'changedBy', as: 'changedByUser' });

Note.hasMany(NoteShare, { foreignKey: 'noteId', as: 'shares' });
NoteShare.belongsTo(Note, { foreignKey: 'noteId', as: 'note' });
NoteShare.belongsTo(User, { foreignKey: 'sharedWithUserId', as: 'sharedWithUser' });

Note.hasMany(NoteAttachment, { foreignKey: 'noteId', as: 'attachments' });
NoteAttachment.belongsTo(Note, { foreignKey: 'noteId', as: 'note' });

module.exports = {
  User,
  Note,
  NoteVersion,
  NoteShare,
  NoteAttachment
};

