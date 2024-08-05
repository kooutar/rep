const express = require('express');//framework pour créer des applications web
const bodyParser = require('body-parser');//middleware pour parser les corps des requêtes HTTP
// const nodemailer = require('nodemailer');//pour envoie un meg en mail
const session = require('express-session'); // Importer express-session
const flash = require('connect-flash'); // Importer connect-flash
// const crypto = require('crypto');
var path=require('path');
const mysql = require('mysql2');//module pour interagir avec une base de données MySQL
const app = express();
const multer = require('multer');//pour les img
// const fs = require('fs');  // Importer fs pour lire le fichier en tant que binaire
exports.app = app;


//Configuration de l'application
app.use(bodyParser.json());// Utilisation de body-parser pour analyser les requêtes JSON
app.use(bodyParser.urlencoded({ extended: true }));// Middleware pour parser les données du formulaire


app.use(express.static(path.join(__dirname,'')));// Servir les fichiers statiques depuis le répertoire courant

app.set('views', path.join(__dirname,'views'))
app.set('view engine', 'ejs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/uploads'); // Vérifiez que ce dossier existe
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });



app.get('/',function(req, resp){
  resp.render('home');
});


// Configuration de la connexion à la base de données MySQL
const db = mysql.createConnection({
host: 'localhost',
user: 'root',
 password: 'Ycode@2021',//Ycode@2021
database: 'SAM'
});
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to database');
});


app.use(session({
    secret: '123456',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Pour HTTPS, mettez secure: true
  }));
  app.use(flash());
  
  // Middleware pour injecter les messages flash dans les vues
  app.use((req, res, next) => {
    res.locals.message = req.flash('message');
    next();
  });
/////// insription
  app.post('/inscription', (req, res) => {
    const { nom, prenom, telephone, email, adresse, profession, organisation, mot_de_passe } = req.body;

    const sql1 = "SELECT * FROM utilisateurs WHERE email=? ";
    db.query(sql1, [email], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'email :', err);
            return res.status(500).send('Erreur lors de la vérification de l\'email');
        }

        if (results.length > 0) {
           console.log( 'email existe déjà en base de données');
              req.flash('message', 'email deja enregistrer  !');
             return res.redirect('/index');
        } else {
            const sql = `INSERT INTO utilisateurs (nom, prenom, telephone, email, adresse, profession, organisation, mot_de_passe, role)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Utilisateur')`;

            db.query(sql, [nom, prenom, telephone, email, adresse, profession, organisation, mot_de_passe], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'insertion de l\'utilisateur:', err);
                    res.status(500).send('Erreur serveur');
                } else {
                    console.log('Inscription réussie !')
                    req.flash('message', 'Inscription réussie !');
                   return res.redirect('/index');
                }
            });
        } 
    });
});

// login
app.post('/login', (req, res) => {
      const { mail, password } = req.body;
      const sql = 'SELECT role FROM utilisateurs WHERE email = ? AND mot_de_passe = ?';
      db.query(sql, [mail, password], (err, results) => {
        if (err) {
          console.error('Erreur lors de la requête de connexion :', err);
          return res.status(500).json({ message: 'Erreur lors de la connexion : ' + err.message });
        }
        if (results.length > 0) {
          const role = results[0].role;
          if (role === 'Administrateur') {
            //  res.json({ message: 'Connexion réussie'});
             res.redirect('/admin');
          } else {
            //  res.json({ message: 'Connexion réussie' });
             res.redirect('/evenement'); 
          }
        } else {
            console.log("mdp ou mail inccorect ")
           req.flash('message', 'mdp ou mail inccorect !');
           res.redirect('/login');
        }
      });
    });

// Route pour traiter le formulaire et stocker l'image dans la base de données
app.post('/actuialite', upload.single('imgActulaite'), (req, res) => {
  if (!req.file) {
      return res.status(400).send('Le téléchargement de l\'image est obligatoire.');
  }

  const { titre, discription } = req.body;
  const imgActulaite = req.file.path; // Les données de l'image sous forme de buffer
  console.log(imgActulaite);
  // Insérer les données dans la base de données
  const query = 'INSERT INTO actulaite (titre, contenu , image) VALUES (?, ?, ?)';
  db.query(query, [titre, discription ,imgActulaite], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'insertion des données:', err);
          return res.status(500).send('Erreur lors de l\'insertion des données.');
      }
     console.log('Données enregistrées avec succès.');
     res.redirect('actuialite')
  });
});

//route pour recuperer les donnes de table
app.get('/actuialite', (req, res) => {
  const query = 'SELECT * FROM actulaite';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des données:', err);
          return res.status(500).send('Erreur lors de la récupération des données.');
      }
      res.render('actuialite', { actuialites: results });
  });
});
//pour insere les evenement
app.post('/event', upload.single('imgevent'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Le téléchargement de l\'image est obligatoire.');
  }

  const { titre, discription, date_debut, date_fin, lieu } = req.body;
  const imgevent = req.file.path;
  console.log(imgevent);
  const query = 'INSERT INTO evenements (titre, description, date_debut, date_fin, lieu, image) VALUES (?, ?, ?, ?,?,?)';
  db.query(query, [titre, discription, date_debut, date_fin, lieu,imgevent], (err, result) => {
    if (err) {
      console.error('Erreur lors de l\'insertion des données :', err);
      return res.status(500).send('Erreur lors de l\'insertion des données.');
    }
    console.log('Données enregistrées avec succès.');
    res.redirect('/evenements');
  });
});
//pour afficher les evenements 
app.get('/evenements', (req, res) => {
  const query = 'SELECT * FROM evenements';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des données:', err);
          return res.status(500).send('Erreur lors de la récupération des données.');
      }
      res.render('evenements', { evenements: results });
  });
});

app.get('/candidater/:id', (req, res) => {
  const eventId = req.params.id;
  console.log('id est ', eventId)
  const query = 'SELECT titre , image FROM evenements WHERE id = ?';
  db.query(query, [eventId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération de l\'événement:', err);
          return res.status(500).send('Erreur lors de la récupération de l\'événement.');
      }
      if (results.length === 0) {
          return res.status(404).send('Événement non trouvé.');
      }
      // res.render('candidater', { evenement: results[0] });
      res.render('candidater', { 
        evenement: results[0], 
        id: eventId, 
        image: results[0].image 
       
        
    });
    
  });
});

app.post('/submit-inscription', (req, res) => {
  const { eventID, nom, prenom, email } = req.body;
  
  const query = 'INSERT INTO candidatures (event_id, nom, prenom, email) VALUES (?, ?, ?, ?)';
  db.query(query, [eventID, nom, prenom, email], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'inscription:', err);
          return res.status(500).send('Erreur lors de l\'inscription.');
      }
      res.redirect('/evenements'); // Redirige vers la liste des événements après l'inscription
  });
});


//les routes
app.get('/index', (req, res) => {
  res.render('index');
});
  app.get('/login', (req, res) => {
    res.render('login');
  });
  
  app.get('/admin', (req, res) => {
    res.render('admin');
  });
  
  app.get('/evenement', (req, res) => {
    res.render('evenement');
  });
  app.get('/evenements', (req, res) => {
    res.render('evenements');
  });

  app.get('/actuialite', (req, res) => {
    res.render('actuialite');
  });
  // app.get('/candidater/:id', (req, res) => {
  //   res.render('candidater');
  // });
  

  app.listen(8000,function(){
    console.log("heard en 8000");
  });
    