import DataLoader from "dataloader";
import { User } from "../entities/User";

export const createUserLoader = () => 
    new DataLoader<number, User>(async (userIds) => {
        const users = await User.findByIds(userIds as number[]);
        const userIdToUser: Record<number,User> = {};

        console.log(userIds)

        users.forEach((u) => {
        
            userIdToUser[u._id] = u;
            
        });

        
        return userIds.map((userId) => userIdToUser[userId]);

    }
);
