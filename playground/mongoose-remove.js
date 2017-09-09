const {ObjectID} = require('mongodb');
const {mongoose} = require('./../server/db/mongoose');
const {Todo} = require('./../server/models/todo');
const {User} = require('./../server/models/user');

// Todo.remove({})

// Todo.remove({}).then((result) => {
//   console.log(result);
// });

//Todo.findOneAndRemove()
//Todo.findByIdAndRemove()

Todo.findOneAndRemove({_id: '59b3de8b2521ba5a33bd846c'}).then((todo) => {
  console.log(todo);
});

Todo.findByIdAndRemove('59b3de8b2521ba5a33bd846c').then((todo) => {
  console.log(todo);
});
