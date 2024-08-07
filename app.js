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
app.use(express.static('public'));
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

app.get('/candidater/:id', (req, res) => {
  const eventId = req.params.id;
  console.log('id event est ', eventId);
  const query = 'SELECT titre, image FROM evenements WHERE id = ?';
  db.query(query, [eventId], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'événement:', err);
      return res.status(500).send('Erreur lors de la récupération de l\'événement.');
    }
    if (results.length === 0) {
      return res.status(404).send('Événement non trouvé.');
    }
    
    // Ajoutez le console.log ici pour vérifier le chemin de l'image
    const imagePath = results[0].image.replace(/\\/g, '/');
    console.log('Chemin de l\'image:', imagePath);

    res.render('candidater', { 
      evenement: results[0], 
      id: eventId, 
      image: results[0].image 
    });
  });
});

app.get('/listeCandidatures/:id', (req, res) => {
  const eventId = req.params.id;
  console.log('id event est liste ', eventId);

  const query = `
      SELECT nom, prenom, telephone, email, adresse, profession, organisation
      FROM utilisateurs u, candidature c
      WHERE u.id = c.utilisateur_id AND c.evenement_id = ?
  `;

  db.query(query, [eventId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des candidatures :', err);
          return res.status(500).send('Erreur lors de la récupération des candidatures.');
      }
    
      res.render('candidatures', { candidatures: results });
  });
});

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

// Route pour accepter une candidature
app.get('/update-candidature/accept/:email', (req, res) => {
  const email = req.params.email;

  // Mettre à jour le statut dans la table candidatures
  const query = `
      UPDATE candidature 
      SET status = ? 
      WHERE utilisateur_id = (SELECT id FROM utilisateurs WHERE email = ?)
  `;
  db.query(query, ['approuvée', email], (err, results) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de la candidature :', err);
          return res.status(500).send('Erreur lors de la mise à jour de la candidature.');
      }

      // Redirigez vers une page appropriée après la mise à jour
      res.redirect('/liste-des-candidatures');
  });
});

// Route pour refuser une candidature
app.get('/update-candidature/reject/:email', (req, res) => {
  const email = req.params.email;

  // Mettre à jour le statut dans la table candidatures
  const query = `
      UPDATE candidature 
      SET status = ? 
      WHERE utilisateur_id = (SELECT id FROM utilisateurs WHERE email = ?)
  `;
  db.query(query, ['rejetée', email], (err, results) => {
      if (err) {
          console.error('Erreur lors de la mise à jour de la candidature :', err);
          return res.status(500).send('Erreur lors de la mise à jour de la candidature.');
      }

      // Redirigez vers une page appropriée après la mise à jour
      res.redirect('/liste-des-candidatures');
  });
});


// login
app.post('/login', (req, res) => {
      const { mail, password } = req.body;
      
      const sql = 'SELECT id, role FROM utilisateurs WHERE email = ? AND mot_de_passe = ?';
      db.query(sql, [mail, password], (err, results) => {
        if (err) {
          console.error('Erreur lors de la requête de connexion :', err);
          return res.status(500).json({ message: 'Erreur lors de la connexion : ' + err.message });
        }
        if (results.length > 0) {
          const userId = results[0].id;
          const role = results[0].role;
          if (role === 'Administrateur') {
            //  res.json({ message: 'Connexion réussie'});
             res.redirect('/admin');
          } else {
            // Lors de la connexion
            req.session.userId = userId;
        console.log('User ID stored in session:', req.session.userId);
             res.redirect('/evenements'); 
          }
        } else {
            console.log("mdp ou mail inccorect ")
           req.flash('message', 'mdp ou mail inccorect !');
           res.redirect('/login');
        }
      });
    });
// Route pour afficher les événements auxquels un utilisateur a participé
app.get('/profil/:id', (req, res) => {
  const userId = req.params.id;

  // Requête pour récupérer les événements auxquels l'utilisateur a participé
  const query = `
      SELECT  e.titre, c.status
      FROM evenements e
      JOIN candidature c ON e.id = c.evenement_id
      WHERE c.utilisateur_id = ?
  `;

  db.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des événements:', err);
          return res.status(500).send('Erreur lors de la récupération des événements.');
      }

      // Rendre la vue avec les événements
      res.render('profile', { evenements: results });
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

app.get('/evenements', (req, res) => {
  const userId = req.session.userId;
  const query = 'SELECT * FROM evenements';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des événements:', err);
      return res.status(500).send('Erreur lors de la récupération des événements.');
    }

    // Ajoutez un console.log ici pour vérifier les chemins des images de chaque événement
    results.forEach(event => {
      console.log('Chemin de l\'image:', event.image);
    });

    res.render('evenements', { 
      evenements: results,
      userId: userId
  });
  });
});

app.get('/liste-des-candidatures', (req, res) => {
  const query = 'SELECT * FROM evenements';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des événements:', err);
      return res.status(500).send('Erreur lors de la récupération des événements.');
    }

    // Ajoutez un console.log ici pour vérifier les chemins des images de chaque événement
    results.forEach(event => {
      console.log('Chemin de l\'image:', event.image);
    });

    res.render('liste-des-candidatures', { evenements: results });
  });
});



app.post('/submit-inscription', (req, res) => {
  const userId = req.session.userId;// ID de l'utilisateur connecté stocké dans la session
  // const eventId = req.session.eventID; 
  const  eventId  = req.body.eventId;
  console.log('submit id',userId);
  console.log('submit event',eventId);
  const query = 'INSERT INTO candidature ( utilisateur_id ,evenement_id ) VALUES (?, ?)';
  db.query(query, [userId, eventId], (err, result) => {
      if (err) {
          console.error('Erreur lors de l\'inscription:', err);
          return res.status(500).send('Erreur lors de l\'inscription.');
      }
      req.flash('message', 'votre inscription ce faite avec succés  merci de attendre l\'acception !');
      res.redirect('/evenements'); // Redirige vers la liste des événements après l'inscription
  });
});


//les routes
app.get('/index', (req, res) => {
  res.render('index', {
    messages: req.flash('message') // Assurez-vous que les messages sont passés à la vue
  });
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
  app.get('/profile', (req, res) => {
    res.render('profile');
  });

  app.get('/candidater', (req, res) => {
    res.render('candidater');
  });
   app.get('/liste-des-candidatures' , (req, res) => {
   
    res.render('liste-des-candidatures');
   });

   app.get('/candidatures' , (req, res) => {
   
    res.render('candidatures');
   });

  app.listen(8000,function(){
    console.log("heard en 8000");
  });
    