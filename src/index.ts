import 'reflect-metadata';
import "dotenv-safe/config";
import { COOKIE_NAME, __prod__ } from "./constants"; 
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql'
import { HelloReslover } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from './resolvers/user';
import Redis from 'ioredis';
import session from 'express-session';
import connectRedis from 'connect-redis'
import cors from 'cors'
import { createConnection } from 'typeorm'
import { Post } from './entities/Post';
import { User } from './entities/User';
import path from 'path'
import { Updoot } from './entities/Updoot';
import { createUserLoader } from './utils/createUserLoader';
import { createUpdootLoader } from './utils/createUpdootLoader';


const main = async () => {

    const conn = await createConnection({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        logging: true,
        //synchronize: true, //Create tables automatically, no migrations needed
        entities: [Post, User, Updoot],
        migrations: [path.join(__dirname, "./migrations/*")],
    });

    await conn.runMigrations();


    const RedisStore = connectRedis(session);
    const redis = new Redis(process.env.REDIS_URL);
    

    const app = express();
    

    app.set("proxy", 1);
    app.use(
        cors({
            origin: process.env.CORS_ORIGIN,
            credentials: true,
        })
    );
    app.use(
        session({
            name:COOKIE_NAME,
            store: new RedisStore({ 
                client: redis,
                disableTouch: true,
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 *365 * 10, //10 Years
                sameSite: 'lax', //csrf
                httpOnly: true,
                secure: __prod__, //Cookie only works in https
                domain: __prod__ ? ".rgts.website" : undefined,
            },
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET,
            resave: false,
        })
    )



    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloReslover, PostResolver, UserResolver],
            validate: false,
        }),
        context: ({ req, res }) => ({ 
            req, 
            res, 
            redis,
            userLoader: createUserLoader(),
            updootLoader: createUpdootLoader()
        })
    });

    apolloServer.applyMiddleware({
        app,
        cors: false,
    })

    apolloServer.applyMiddleware({ app });

    app.listen(parseInt(process.env.PORT), () => {
        console.log('Server started on localhost:4000');
    });

};

main().catch(err => {
    console.error(err);
});


console.log('Done!')