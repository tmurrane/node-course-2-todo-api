const expect = require('expect');
const request = require('supertest');
const {ObjectID} = require('mongodb');

const {app} = require('./../server');
const {Todo} = require('./../models/todo');
const {User} = require('./../models/user');
const {todos, populateTodos, users, populateUsers} = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
  it('should create a new Todo', (done) => {
    var text = 'Test todo text';

    request(app)
    .post('/todos')
    .send({text})
    .expect(200)
    .expect((res) => {
      expect(res.body.text).toBe(text);
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }
      Todo.find({text}).then((todos) => {
        expect(todos.length).toBe(1);
        expect(todos[0].text).toBe(text);
        done();
      }).catch((e) => done(e));
    })
  });

  it('should NOT create todo with invalid body', (done) => {
    request(app)
    .post('/todos')
    .send({})
    .expect(400)
    .end((err, res) => {
      if (err) {
        return done(err);
      }
      Todo.find().then((todos) => {
        expect(todos.length).toBe(2);
        done();
      }).catch((e) => done(e));
    });
  });

  describe('GET /todos', () => {
    it('should get all todos', (done) => {
      request(app)
        .get('/todos')
        .expect(200)
        .expect((res) => {
          expect(res.body.todos.length).toBe(2);
        })
        .end(done);
    });
  });

  describe('GET /todos/:id', () => {
    it('should return todo doc', (done) => {
      request(app)
        .get(`/todos/${todos[0]._id.toHexString()}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.todo.text).toBe(todos[0].text);
        })
        .end(done);
    });

    it('should return a 404 if todo not found', (done) => {
      var testId = new ObjectID().toHexString();
        request(app)
          .get(`/todos/${testId}`)
          .expect(404)
          .end(done);
    });

    it('should return 404 for non-object ids', (done) => {
      // todos/123
      request(app)
        .get('/todos/123abc')
        .expect(404)
        .end(done);
    })
  });

  describe('DELETE /todos/:id', () => {
    it('should remove a todo', (done) => {
      var hexId = todos[1]._id.toHexString();

      request(app)
        .delete(`/todos/${hexId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.todo._id).toBe(hexId);
        })
        .end((err, res) => {
          if (err) {
            return done(err);
          }
          //query database using findById, toNotExist
          Todo.findById(hexId).then((todos) => {
            expect(todos).toNotExist();
            done();
          }).catch((e) => done(e));
        });
    });

    it('should return 404 if todo not found', (done) => {
      var testId = new ObjectID().toHexString();
      request(app)
              .delete(`/todos/${testId}`)
              .expect(404)
              .end(done);
    });

    it('should return 404 if object id is invalid', (done) => {
      var testId = new ObjectID().toHexString();
      request(app)
              .delete(`/todos/${testId}`)
              .expect(404)
              .end(done);
    });
  });

  describe('PATCH /todos/:id', () => {
    it('should update todo', (done) => {
      //grab id of first item
      var hexId = todos[0]._id.toHexString();
      var textNew = 'This is new text to be updated';

      //make patch request - update text, set completed = true
      request(app)
        .patch(`/todos/${hexId}`)
        .send({
          completed: true,
          text: textNew
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.todo.text).toBe(textNew);
          expect(res.body.todo.completed).toBe(true);
          expect(res.body.todo.completedAt).toBeA('number')
        })
        .end(done);
    });

    it('should clear completedAt when todo is not completed', (done) => {
      //grab id of second item
      //update text, set completed=false
      //assert 200, res.body is changed, completed=false, completedAt is null (.toNotExist)
      var hexId = todos[1]._id.toHexString();
      var textNew = 'This is new text to be updated!!!';

      //make patch request - update text, set completed = true
      request(app)
        .patch(`/todos/${hexId}`)
        .send({
          completed: false,
          text: textNew
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.todo.text).toBe(textNew);
          expect(res.body.todo.completed).toBe(false);
          expect(res.body.todo.completedAt).toNotExist();
        })
        .end(done);
    });
  });

describe('GET /users/me', () => {
  it('should return user if auth', (done) => {
    request(app)
      .get('/users/me')
      .set('x-auth', users[0].tokens[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body._id).toBe(users[0]._id.toHexString());
        expect(res.body.email).toBe(users[0].email);
      })
      .end(done);
  });

  it('should return 401 if not auth', (done) => {
    //toEqual
    request(app)
      .get('/users/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({});
      })
      .end(done);
  });
});

describe('POST /users', () => {
  it('should create a user', (done) => {
    var email = 'example@example.com';
    var password = '123mnb!';
    request(app)
      .post('/users')
      .send({email, password})
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
        expect(res.body._id).toExist();
        expect(res.body.email).toBe(email);
      })
      .end((err) => {
        if (err) {
          return done(err);
        }
        User.findOne({email}).then((user) => {
          expect(user).toExist();
          expect(user.password).toNotBe(password); //user sb hashed
          done();
        }).catch((e) => done(e));;
      });
  });

  it('should return validation errors if invalidate', (done) => {
    //400 on invalid email and password
    var email = 'example';
    var password = 'abc';
    request(app)
      .post('/users')
      .send({email, password})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.find().then((user) => {
          expect(user.length).toBe(2);
          done();
        }).catch((e) => done(e));
      });
  });

  it('should not create user if email in use', (done) => {
    //use email already in use, valid password, 400
    var email = users[0].email;
    var password = '123abc!';
    request(app)
      .post('/users')
      .send({email, password})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.find().then((user) => {
          expect(user.length).toBe(2);
          done();
        }).catch((e) => done(e));
      });
  });
}); //describe POST

describe('POST /users/login', () => {
  it('should login user and return token', (done) => {
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: users[1].password
      })
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-auth']).toExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(users[1]._id).then((user) => {
          expect(user.tokens[0]).toInclude({
            access: 'auth',
            token: res.headers['x-auth']
          });
          done();
        }).catch((e) => done(e));
      });
  });

  it('should reject invalid login', (done) => {
    //pass in invalid password, 400, x-auth not exists, token length 0
    request(app)
      .post('/users/login')
      .send({
        email: users[1].email,
        password: 'abc123!!'
      })
      .expect(400)
      .expect((res) => {
        expect(res.headers['x-auth']).toNotExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        User.findById(users[1]._id).then((user) => {
          expect(user.tokens.length).toBe(0);
          done();
        }).catch((e) => done(e));
      });
  });
});

});
