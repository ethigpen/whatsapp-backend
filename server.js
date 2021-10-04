import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js'
import Pusher from 'pusher'
import Cors from 'cors'

const app = express();
const port = process.env.PORT || 8000;

// db config

const pusher = new Pusher({
    appId: "1271805",
    key: "58f2140cde8e0415f221",
    secret: "adc60e2d402a1610fba0",
    cluster: "us2",
    useTLS: true
});

pusher.trigger("my-channel", "my-event", {
    message: "hello world"
});

//mongoose connection/config
mongoose.connect("mongodb+srv://root:rootroot@mernprojects.9thih.mongodb.net/whatsappdb?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Established a connection to the database'))
    .catch(err => console.log('Something went wrong when connecting to the database ', err));

app.use(express.json())
app.use(Cors())


const db = mongoose.connection
db.once('open', () => {
    console.log("DB connected");

    const msgCollection = db.collection('messagecontents')
    const changeStream = msgCollection.watch();

    changeStream.on('change', (change) => {
        console.log(change)

        if (change.operationType == 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted',
                {
                    name: messageDetails.name,
                    message: messageDetails.message,
                    timestamp: messageDetails.timestamp,
                    received: messageDetails.received,
                });
        } else {
            console.log('error triggering pusher')
        }
    })
})

// api routes
app.get('/', (req, res) => res.status(200).send('hello emile'))
app.get('/messages/sync', (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(200).send(data)
        }
    })
})
app.post('/messages/new', (req, res) => {
    const dbMessage = req.body
    Messages.create(dbMessage, (err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            res.status(201).send(data)
        }
    })
})


// listener
app.listen(port, () => console.log(`Listening on port: ${port}`));