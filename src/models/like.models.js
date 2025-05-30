import mongoose, { Schema} from "mongoose";


const likeSchema = new Schema({
    comment:{
        type: Schema.Types.ObjectId,  
        ref: ""
    },
    video:{
        ype: Schema.Types.ObjectId,  
        ref: "Videos"
    },
    likedBy:{
        ype: Schema.Types.ObjectId,  
        ref: "User"
    },
    tweet:{
        ype: Schema.Types.ObjectId,  
        ref: "Tweet"
    }
    
},{timestamps: true})

export const Like = mongoose.model("Like", likeSchema)