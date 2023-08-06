const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized: false},
    host : process.env.DATABASE_HOST,
    port : 5432,
    user : process.env.DATABASE_USER,
    password : process.env.DATABASE_PW,
    database : process.env.DATABASE_DB
  }
});

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('success');
})

app.post('/signin', (req, res) => {
  db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(response => {
      const isValid = bcrypt.compareSync(req.body.password, response[0].hash);
      if (isValid) {
        db.select('*').from('users')
          .where('email', '=', req.body.email)
          .then(user => {
            res.json(user[0])
          })
          .catch(err => res.status(400).json('unable to get user'))
      } else {
        res.status(400).json('invalid user name or password');
      }
    })
    .catch(err => res.status(400).json('invalid user name or password'));
})

app.post('/register', (req, res) => {
  const { email, name, password } = req.body;
  //async
  // bcrypt.hash(password, null, null, function(err, hash) {  
  // });
  // sync
  const hash = bcrypt.hashSync(password);
    // transaction executes only if all go well
    db.transaction(trx => {
      trx.insert({
        hash: hash,
        email: email,
      })
      .into('login')
      .returning('email')
      .then(loginEmail => {
        return trx('users')
        .returning('*')  
        .insert({
          email: loginEmail[0].email,
          name: name,
          joined: new Date()
        })
        .then(response => {
          res.json(response[0]);
        })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    }) 
    .catch(err => res.status(400).json('email already exists'))
});

app.get('/profile/:id', (req, res) => {
  const { id } = req.params;
  db.select('*').from('users').where({id})
    .then(user => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json('Not found');
      }
    })
    .catch(err => res.status(400).json('error getting user'));
})

app.put('/image', (req, res) => {
  const { id } = req.body;
  db('users').where('id', '=', id)
  .increment('entries', 1)
  .returning('entries')
  .then(entries => {
    res.json(entries[0].entries);
  })
  .catch(err => res.status(400).json('unable to get entries'))
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`app runing on port ${process.env.PORT}`);
})
