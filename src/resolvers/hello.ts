import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloReslover{
    @Query(() => String)
    hello() {
        return "Hello World"
    }
}