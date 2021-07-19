import { UsernamePasswordInput } from "../resolvers/UsernamePasswordInput"


export const validateRegister = (options: UsernamePasswordInput) => {


    if(!options.email.includes('@')){
        return [{
                field: 'email',
                message: "Invalid email"
            }]
        }
    

    if(options.username.includes('@')){
        return [{
                field: 'username',
                message: "Cannot include an @."
            }]
        }

    if(options.username.length <= 2){
        return [{
                field: 'username',
                message: "Username has to be at least 3 characters long"
            }]
        
    }


    if(options.password.length <= 2){
        return [{
                field: 'password',
                message: "Password has to be at least 3 characters long"
            }]
        
    }

}