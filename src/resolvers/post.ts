import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { getConnection } from "typeorm";
import { Post } from "../entities/Post";
import { Updoot } from "../entities/Updoot";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";

@InputType()
class PostInput{
    @Field()
    title: string;
    @Field()
    text: string;
}

@ObjectType()
class PaginatedPosts {
    @Field(() => [Post])
    posts: Post[]
    @Field()
    hasMore: boolean;
}

@Resolver(Post)
export class PostResolver{

    @FieldResolver(() => User)
    creator(@Root() post: Post,
    @Ctx() {userLoader}: MyContext
    ){
        return userLoader.load(post.creatorId)
    }

    @FieldResolver(() => String)
    textSnippet(
        @Root() root: Post
    ){
        return root.text.slice(0,50);
    }

    @FieldResolver(() => Int, {nullable: true})
    async voteStatus(@Root() post: Post, @Ctx() {updootLoader, req}: MyContext){
        if(!req.session.userId){
            return null
        }
        const updoot = await updootLoader.load(
            { postId: post._id, userId: req.session.userId }
            );


        return updoot ? updoot.value : null;
    }


    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg("postId", ()=> Int) postId: number,
        @Arg("value", ()=> Int) value: number,
        @Ctx() {req}: MyContext
    ){
        const isUpdoot = value !== -1;
        const realValue = isUpdoot ? 1: -1;
        const { userId } = req.session;
        const updoot = await Updoot.findOne({where: {postId, userId}});

        if(updoot && updoot.value !== realValue){

            //changing vote
            await getConnection().transaction(async tm =>{
                
                await tm.query(`
                UPDATE updoot
                SET value = ${realValue}
                where "postId" = ${postId} and "userId" = ${userId};
                `);

                if(updoot.value === 0){
                    await tm.query(`
                    UPDATE post
                    SET points = points + ${realValue}
                    where _id = ${postId};
                    `);
    
                } 
                else{
                    await tm.query(`
                    UPDATE post
                    SET points = points + ${2*realValue}
                    where _id = ${postId};
                    `);
                }                
                
            });
        }
        else if (!updoot){
            //no vote
            await getConnection().transaction(async tm =>{
                await tm.query(`
                insert into updoot ("userId", "postId", value)
                values (${userId}, ${postId}, ${realValue});
                `);

                await tm.query(`
                UPDATE post
                SET points = points + ${realValue}
                where _id = ${postId};
                `);

            });
        }
        else{
            //yes vote
            await getConnection().transaction(async tm =>{
                          
                await tm.query(`
                UPDATE updoot
                SET value = ${0}
                where "postId" = ${postId} and "userId" = ${userId};
                `);

                console.log(realValue)
                await tm.query(`
                UPDATE post
                SET points = points - ${realValue}
                where _id = ${postId};
                `);

            });
        }
        return true

    }
    
    @Query(() => PaginatedPosts)
    async posts(
        @Arg('limit', ()=> Int) limit: number,
        @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
        @Ctx () {req}: MyContext
    ): Promise<PaginatedPosts>
    {
        const realLimit = Math.min(50, limit) + 1;
        
        const replacements: any[] = [realLimit];

        if (cursor){
            replacements.push(new Date(parseInt(cursor)));
        }
        
        const whereClause = `where p."createdAt" < $2`

        const posts = await getConnection().query(
            `
            SELECT p.*
            from post p
            ${cursor ? whereClause : ''}
            ORDER BY p."createdAt" DESC
            LIMIT $1;
        `, 
            replacements
        );

        
        return { posts: posts.slice(0, realLimit - 1), hasMore: posts.length === realLimit };
    }

    @Query(() => Post, { nullable: true })
    
    async post(
        @Arg("_id", () => Int) _id: number,
        @Ctx () {req}: MyContext,
    ): Promise<Post | undefined>
    {
        
        const replacements: any[] = [_id];

        if(req.session.userId){
            replacements.push(req.session.userId);
        }
        
        const whereClause = `where p._id = $1`

        const posts = await getConnection().query(
            `
            SELECT p.*
            ${
                req.session.userId ? 
                ',(SELECT value FROM updoot WHERE "userId" = $2 and "postId" = p._id) "voteStatus"'
                : ',null as "voteStatus"'
            }
            from post p
            ${whereClause}
            LIMIT 1;
        `, 
            replacements
        );
        
        //returns only one, or null
        return posts[0];
    }


    @Mutation(() => Post, { nullable: true })
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("input", () => PostInput) input: PostInput,
        @Ctx() {req}: MyContext
    ): Promise<Post>
    {
        //2 sql queries
        return Post.create({
            ...input,
            creatorId: req.session.userId
        }
        ).save();
    }


    @Mutation(() => Post, { nullable: true })
    async updatePost(
        @Arg("_id", () => Int) _id: number,
        @Arg("title", () => String) title: string,
        @Arg("text", () => String, {  nullable: true }) text: string,
        @Ctx() { req }: MyContext
    ): Promise<Post | null>
    {
        const result =  await getConnection()
        .createQueryBuilder()
        .update(Post)
        .set({ title, text })
        .where('_id = :_id and "creatorId" = :creatorId', {_id, creatorId: req.session.userId})
        .returning("*")
        .execute()

        return result.raw[0];
        
    }

    @Mutation(() => Boolean)
    @UseMiddleware(isAuth)
    async deletePost(
        @Arg("_id", () => Int) _id: number,
        @Ctx() { req }: MyContext
    ): Promise<boolean>
    {
        // const post = await Post.findOne(_id);
        // if (!post){
        //     return false;
        // }

        // if (post.creatorId !== req.session.userId){
        //     throw new Error('not authorized');
        // }
        // await Updoot.delete({ postId: _id });
        await Post.delete({ _id, creatorId: req.session.userId });
        return true;
        
    }


}