import mongoose, { Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema({
    videoFile:{
        type: String,  //cloud url
        required: true
    },
    thumbnail:{
        type: String,  //cloud url
        required: true
    },
    title:{
        type: String, 
        required: true
    },
    description:{
        type: String,  //cloud url
        required: true
    },
    duration:{
        type: Number,  //cloud url
        required: true
    },
    views:{
        type: Number,  //cloud url
        default: 0
    },
    isPublished: {
        type: Boolean,  //cloud url
        default: true
    },
    owner:{
        type: Schema.Types.ObjectId,  
        ref: "User"
    }
},{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)