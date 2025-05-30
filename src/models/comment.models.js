import mongoose, { Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentsSchema = new Schema({
    video:{
        type: Schema.Types.ObjectId,  
        ref: "Video"
    },
    owner:{
        type: Schema.Types.ObjectId,  
        ref: "User"
    },
    content:{
        type: String, 
        required: true
    },
},{timestamps: true})

commentsSchema.plugin(mongooseAggregatePaginate)
export const Comments = mongoose.model("Comments", commentschema)