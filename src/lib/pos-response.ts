import { errorResponse } from './api';
import { PosError } from './pos-core';
export function posErrorResponse(error:unknown){return error instanceof PosError?Response.json({error:error.message},{status:error.status}):errorResponse(error);}
