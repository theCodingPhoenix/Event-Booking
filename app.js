const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const {buildSchema} = require('graphql');
const mongoose = require('mongoose');
const Event = require('./models/events');

const app = express();
const events = [];

app.use(bodyParser.json());

app.use(
    '/graphql',
    graphqlHttp({
        schema: buildSchema(`

            type Event {
                _id: ID!
                title: String!
                description: String!
                price: Float!
                date: String!
            }
            input EventInput{
                title: String!
                description: String!
                price: Float!
                date: String!
            }

            type RootQuery {
                events: [Event!]!
            }

            type RootMutation {
                createEvent(eventInput: EventInput): Event
            }

            schema {
                query: RootQuery,
                mutation: RootMutation
            }
        `),
        rootValue: {
            events: () => {
                // get all the events from the db
                // use the return here to let express know that this is an async operation
                return Event.find()
                .then(events => {
                    return events.map(event => {
                        return {...event._doc};
                    })
                })
                .catch(err => {
                    console.log(err);
                });
            },
            createEvent: (args) => {

                // build the js object
                const event = new Event({
                    title: args.eventInput.title,
                    description: args.eventInput.description,
                    price: +args.eventInput.price,
                    date: new Date(args.eventInput.date)
               });

               // return the event so the Graphql knows about the asyn operation
               return event
                .save()
                .then(result => {
                    // result is basically the event that we get
                    // however there is meta data attached to it
                    // so use the _doc method to get the json data
                    return {...result._doc};
                })
                .catch(err => {
                    console.log(err);
                    throw err;
                })
            } 
        },
        graphiql: true
    })
);


mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${
    process.env.MONGO_PASSWORD
}@cluster0-vfwck.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`).then(() => {
    app.listen(3000);
}).catch(err => {
    console.log(err);
});
